"""Websocket API used by the Pineapple Plan card.

Every signed-in household account (including non-admin ones like the kids'
or a kitchen kiosk) can read and edit the plan.
"""

from __future__ import annotations

from datetime import date
import time
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import HomeAssistantError, ServiceNotFound
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from .const import CONF_MEALIE_ENTRY, DOMAIN, SIGNAL_UPDATED
from .plan import PlanData, PlanError

PERSON = vol.Any(None, vol.All(str, vol.Length(max=80)))
SHORT = vol.All(str, vol.Length(max=120))

DAY_PATCH = vol.Schema(
    {
        vol.Optional("adult1_works"): bool,
        vol.Optional("adult1_hours"): vol.All(str, vol.Length(max=40)),
        vol.Optional("adult1_location"): vol.In(["home", "office"]),
        vol.Optional("adult2_works"): bool,
        vol.Optional("adult2_hours"): vol.All(str, vol.Length(max=40)),
        vol.Optional("child1_school"): bool,
        vol.Optional("child2_daycare"): bool,
        vol.Optional("child1_drop"): PERSON,
        vol.Optional("child1_pick"): PERSON,
        vol.Optional("child2_drop"): PERSON,
        vol.Optional("child2_pick"): PERSON,
        vol.Optional("jj"): bool,
        vol.Optional("jj_who"): PERSON,
        vol.Optional("swim"): bool,
        vol.Optional("swim_who"): PERSON,
        vol.Optional("dinner_cook"): vol.In(["adult1", "adult2", "both", "none"]),
        vol.Optional("dinner_type"): vol.Any(None, vol.In(["mealie", "takeout", "other"])),
        vol.Optional("dinner_recipe_id"): vol.Any(None, SHORT),
        vol.Optional("dinner_meal"): SHORT,
        vol.Optional("dinner_note"): vol.All(str, vol.Length(max=200)),
    }
)

ISO_DATE = vol.All(str, vol.Match(r"^\d{4}-\d{2}-\d{2}$"))

_RECIPE_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}
_RECIPE_TTL = 600


@callback
def async_register(hass: HomeAssistant) -> None:
    for handler in (
        ws_config,
        ws_week,
        ws_update_day,
        ws_create_task,
        ws_update_task,
        ws_delete_task,
        ws_recipes,
        ws_subscribe,
    ):
        websocket_api.async_register_command(hass, handler)


def _plan(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> PlanData | None:
    plan = hass.data.get(DOMAIN, {}).get("plan")
    if plan is None:
        connection.send_error(msg["id"], "not_configured", "Pineapple Plan isn't set up yet.")
    return plan


@websocket_api.websocket_command({vol.Required("type"): "pineapple_plan/config"})
@callback
def ws_config(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    if (plan := _plan(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], plan.config_payload())


@websocket_api.websocket_command(
    {vol.Required("type"): "pineapple_plan/week", vol.Required("start"): ISO_DATE}
)
@callback
def ws_week(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    if (plan := _plan(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], plan.week(date.fromisoformat(msg["start"])))


@websocket_api.websocket_command(
    {
        vol.Required("type"): "pineapple_plan/day/update",
        vol.Required("date"): ISO_DATE,
        vol.Required("patch"): DAY_PATCH,
    }
)
@websocket_api.async_response
async def ws_update_day(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    if (plan := _plan(hass, connection, msg)) is None:
        return
    try:
        day = await plan.async_update_day(date.fromisoformat(msg["date"]), msg["patch"])
    except (PlanError, ValueError) as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return
    connection.send_result(msg["id"], day)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "pineapple_plan/task/create",
        vol.Required("title"): vol.All(str, vol.Length(min=1, max=200)),
        vol.Optional("who"): PERSON,
        vol.Optional("date"): vol.Any(None, ISO_DATE),
    }
)
@callback
def ws_create_task(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    if (plan := _plan(hass, connection, msg)) is None:
        return
    try:
        task = plan.create_task(msg["title"], msg.get("who"), msg.get("date"))
    except (PlanError, ValueError) as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return
    connection.send_result(msg["id"], task)


@websocket_api.websocket_command(
    {
        vol.Required("type"): "pineapple_plan/task/update",
        vol.Required("task_id"): str,
        vol.Required("patch"): vol.Schema(
            {
                vol.Optional("title"): vol.All(str, vol.Length(max=200)),
                vol.Optional("who"): PERSON,
                vol.Optional("date"): vol.Any(None, ISO_DATE),
                vol.Optional("done"): bool,
            }
        ),
    }
)
@callback
def ws_update_task(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    if (plan := _plan(hass, connection, msg)) is None:
        return
    try:
        task = plan.update_task(msg["task_id"], msg["patch"])
    except (PlanError, ValueError) as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return
    connection.send_result(msg["id"], task)


@websocket_api.websocket_command(
    {vol.Required("type"): "pineapple_plan/task/delete", vol.Required("task_id"): str}
)
@callback
def ws_delete_task(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    if (plan := _plan(hass, connection, msg)) is None:
        return
    try:
        plan.delete_task(msg["task_id"])
    except PlanError as err:
        connection.send_error(msg["id"], "invalid", str(err))
        return
    connection.send_result(msg["id"])


def _extract_recipes(data: Any) -> list[dict[str, Any]]:
    """Pull {id, name} pairs out of the Mealie response, whatever its exact shape."""
    found: dict[str, dict[str, Any]] = {}

    def walk(node: Any) -> None:
        if isinstance(node, dict):
            name = node.get("name")
            rid = node.get("recipe_id") or node.get("id") or node.get("slug")
            if isinstance(name, str) and rid and ("slug" in node or "recipe_id" in node):
                found.setdefault(str(rid), {"id": str(rid), "name": name})
                return
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    walk(data)
    return sorted(found.values(), key=lambda r: r["name"].lower())


@websocket_api.websocket_command(
    {vol.Required("type"): "pineapple_plan/recipes", vol.Optional("query", default=""): vol.All(str, vol.Length(max=80))}
)
@websocket_api.async_response
async def ws_recipes(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    if (plan := _plan(hass, connection, msg)) is None:
        return
    entry_id = plan.settings.get(CONF_MEALIE_ENTRY)
    if not entry_id:
        connection.send_result(msg["id"], {"available": False, "recipes": []})
        return

    query = msg["query"].strip()
    cache_key = f"{entry_id}:{query.lower()}"
    cached = _RECIPE_CACHE.get(cache_key)
    if cached and time.monotonic() - cached[0] < _RECIPE_TTL:
        connection.send_result(msg["id"], {"available": True, "recipes": cached[1]})
        return

    data: dict[str, Any] = {"config_entry_id": entry_id, "result_limit": 40}
    if query:
        data["search_terms"] = query
    try:
        response = await hass.services.async_call(
            "mealie", "get_recipes", data, blocking=True, return_response=True
        )
    except (ServiceNotFound, HomeAssistantError, vol.Invalid) as err:
        connection.send_result(
            msg["id"], {"available": False, "recipes": [], "error": str(err)}
        )
        return

    recipes = _extract_recipes(response)
    _RECIPE_CACHE[cache_key] = (time.monotonic(), recipes)
    connection.send_result(msg["id"], {"available": True, "recipes": recipes})


@websocket_api.websocket_command({vol.Required("type"): "pineapple_plan/subscribe"})
@callback
def ws_subscribe(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    """Tell the card whenever anything in the plan changes."""

    @callback
    def forward() -> None:
        connection.send_message(websocket_api.event_message(msg["id"], {"event": "updated"}))

    connection.subscriptions[msg["id"]] = async_dispatcher_connect(hass, SIGNAL_UPDATED, forward)
    connection.send_result(msg["id"])
