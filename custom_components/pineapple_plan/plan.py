"""The household plan: per-day overrides on top of weekly defaults, plus tasks."""

from __future__ import annotations

from datetime import date, timedelta
import logging
from typing import Any
import uuid

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.dispatcher import async_dispatcher_send
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util, slugify

from .const import (
    ADULT1,
    ADULT2,
    CHILD1,
    CHILD2,
    CONF_ADULT1_DAYS,
    CONF_ADULT1_HOURS,
    CONF_ADULT1_LOCATION,
    CONF_ADULT2_DAYS,
    CONF_ADULT2_HOURS,
    CONF_CHILD1_DROP,
    CONF_CHILD1_PICK,
    CONF_CHILD2_DROP,
    CONF_CHILD2_PICK,
    CONF_DAYCARE_DAYS,
    CONF_HELPERS,
    CONF_JJ_DAYS,
    CONF_JJ_WHO,
    CONF_MEALIE_ENTRY,
    CONF_MEALIE_WRITE,
    CONF_SCHOOL_DAYS,
    CONF_SWIM_DAYS,
    CONF_SWIM_WHO,
    CONF_WEEK_START,
    DAY_FIELDS,
    DEFAULT_COLORS,
    DEFAULTS,
    DOMAIN,
    HELPER_COLORS,
    NOBODY,
    PERSON_FIELDS,
    ROLES,
    SIGNAL_UPDATED,
    STORAGE_VERSION,
    WEEKDAYS,
)

_LOGGER = logging.getLogger(__name__)


class PlanError(Exception):
    """Raised for invalid requests (unknown task, unknown person...)."""


def helper_key(name: str) -> str:
    """Stable key for a helper (an adult outside the household)."""
    return f"h_{slugify(name)}"


class PlanData:
    """Holds and persists the plan for one household."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self.entry = entry
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}.{entry.entry_id}"
        )
        self._days: dict[str, dict[str, Any]] = {}
        self._tasks: list[dict[str, Any]] = []

    # ----- persistence -------------------------------------------------

    async def async_load(self) -> None:
        data = await self._store.async_load() or {}
        self._days = data.get("days", {})
        self._tasks = data.get("tasks", [])

    async def async_flush(self) -> None:
        await self._store.async_save(self._data())

    def _data(self) -> dict[str, Any]:
        return {"days": self._days, "tasks": self._tasks}

    @callback
    def notify(self) -> None:
        async_dispatcher_send(self.hass, SIGNAL_UPDATED)

    @callback
    def _changed(self) -> None:
        self._store.async_delay_save(self._data, 1)
        self.notify()

    # ----- settings & people ---------------------------------------------

    @property
    def settings(self) -> dict[str, Any]:
        return {**DEFAULTS, **self.entry.data, **self.entry.options}

    def helpers(self) -> list[dict[str, Any]]:
        out = []
        for i, name in enumerate(self.settings.get(CONF_HELPERS) or []):
            name = str(name).strip()
            if not name:
                continue
            out.append(
                {
                    "key": helper_key(name),
                    "name": name,
                    "color": HELPER_COLORS[i % len(HELPER_COLORS)],
                }
            )
        return out

    def members(self) -> dict[str, dict[str, Any]]:
        out: dict[str, dict[str, Any]] = {}
        settings = self.settings
        for role in ROLES:
            entity_id = settings.get(role)
            state = self.hass.states.get(entity_id) if entity_id else None
            attrs = state.attributes if state else {}
            out[role] = {
                "key": role,
                "entity_id": entity_id,
                "name": attrs.get("friendly_name") or entity_id or role,
                "picture": attrs.get("entity_picture"),
                "user_id": attrs.get("user_id"),
                "color": DEFAULT_COLORS[role],
            }
        return out

    def people_keys(self) -> set[str]:
        return set(ROLES) | {h["key"] for h in self.helpers()}

    def person_name(self, key: str | None) -> str | None:
        if not key:
            return None
        if key in ROLES:
            return self.members()[key]["name"]
        for helper in self.helpers():
            if helper["key"] == key:
                return helper["name"]
        return None

    def config_payload(self) -> dict[str, Any]:
        settings = self.settings
        return {
            "title": self.entry.title,
            "members": self.members(),
            "helpers": self.helpers(),
            "week_start": settings.get(CONF_WEEK_START, "sun"),
            "mealie": bool(settings.get(CONF_MEALIE_ENTRY)),
            "activities": {"jj": "Jiu jitsu", "swim": "Swimming"},
        }

    # ----- days -----------------------------------------------------------

    def _default_person(self, value: Any) -> str | None:
        if not value or value == NOBODY:
            return None
        return value if value in self.people_keys() else None

    def defaults_for(self, day: date) -> dict[str, Any]:
        s = self.settings
        wd = WEEKDAYS[day.weekday()]
        school = wd in (s.get(CONF_SCHOOL_DAYS) or [])
        daycare = wd in (s.get(CONF_DAYCARE_DAYS) or [])
        jj = wd in (s.get(CONF_JJ_DAYS) or [])
        swim = wd in (s.get(CONF_SWIM_DAYS) or [])
        return {
            "adult1_works": wd in (s.get(CONF_ADULT1_DAYS) or []),
            "adult1_hours": s.get(CONF_ADULT1_HOURS) or "",
            "adult1_location": s.get(CONF_ADULT1_LOCATION) or "home",
            "adult2_works": wd in (s.get(CONF_ADULT2_DAYS) or []),
            "adult2_hours": s.get(CONF_ADULT2_HOURS) or "",
            "child1_school": school,
            "child2_daycare": daycare,
            "child1_drop": self._default_person(s.get(CONF_CHILD1_DROP)) if school else None,
            "child1_pick": self._default_person(s.get(CONF_CHILD1_PICK)) if school else None,
            "child2_drop": self._default_person(s.get(CONF_CHILD2_DROP)) if daycare else None,
            "child2_pick": self._default_person(s.get(CONF_CHILD2_PICK)) if daycare else None,
            "jj": jj,
            "jj_who": self._default_person(s.get(CONF_JJ_WHO)) if jj else None,
            "swim": swim,
            "swim_who": self._default_person(s.get(CONF_SWIM_WHO)) if swim else None,
            "dinner_cook": "none",
            "dinner_type": None,
            "dinner_recipe_id": None,
            "dinner_meal": "",
            "dinner_note": "",
        }

    def resolve(self, day: date) -> dict[str, Any]:
        resolved = self.defaults_for(day)
        resolved.update(self._days.get(day.isoformat(), {}))
        # A helper who was removed from the settings can no longer be shown.
        valid = self.people_keys()
        for field in PERSON_FIELDS:
            if resolved.get(field) and resolved[field] not in valid:
                resolved[field] = None
        resolved["date"] = day.isoformat()
        return resolved

    def week_start_for(self, day: date) -> date:
        start_dow = 6 if self.settings.get(CONF_WEEK_START, "sun") == "sun" else 0
        return day - timedelta(days=(day.weekday() - start_dow) % 7)

    def week(self, start: date) -> dict[str, Any]:
        end = start + timedelta(days=6)
        days = [self.resolve(start + timedelta(days=i)) for i in range(7)]
        tasks = [
            t
            for t in self._tasks
            if t.get("date") is None or start.isoformat() <= t["date"] <= end.isoformat()
        ]
        return {"start": start.isoformat(), "days": days, "tasks": tasks}

    async def async_update_day(self, day: date, patch: dict[str, Any]) -> dict[str, Any]:
        valid = self.people_keys()
        for field in PERSON_FIELDS:
            if field in patch and patch[field] is not None and patch[field] not in valid:
                raise PlanError(f"Unknown person: {patch[field]}")
        unknown = set(patch) - set(DAY_FIELDS)
        if unknown:
            raise PlanError(f"Unknown fields: {', '.join(sorted(unknown))}")

        iso = day.isoformat()
        before = self.resolve(day)
        defaults = self.defaults_for(day)
        current = {**self._days.get(iso, {}), **patch}
        # Only keep what differs from the defaults, so changing a default later
        # still applies to days nobody touched.
        current = {k: v for k, v in current.items() if defaults.get(k) != v}
        if current:
            self._days[iso] = current
        else:
            self._days.pop(iso, None)
        self._changed()

        after = self.resolve(day)
        if (
            after.get("dinner_type") == "mealie"
            and after.get("dinner_recipe_id")
            and after.get("dinner_recipe_id") != before.get("dinner_recipe_id")
        ):
            self.hass.async_create_task(self._async_write_mealplan(day, after["dinner_recipe_id"]))
        return after

    async def _async_write_mealplan(self, day: date, recipe_id: str) -> None:
        s = self.settings
        if not s.get(CONF_MEALIE_WRITE) or not s.get(CONF_MEALIE_ENTRY):
            return
        try:
            await self.hass.services.async_call(
                "mealie",
                "set_mealplan",
                {
                    "config_entry_id": s[CONF_MEALIE_ENTRY],
                    "date": day.isoformat(),
                    "entry_type": "dinner",
                    "recipe_id": recipe_id,
                },
                blocking=True,
            )
        except Exception as err:  # noqa: BLE001 - a failed write-back must never break planning
            _LOGGER.warning("Could not add dinner to the Mealie meal plan: %s", err)

    # ----- tasks ----------------------------------------------------------

    def _task(self, task_id: str) -> dict[str, Any]:
        for task in self._tasks:
            if task["id"] == task_id:
                return task
        raise PlanError("Task not found")

    def _check_task_fields(self, fields: dict[str, Any]) -> None:
        who = fields.get("who")
        if who is not None and who not in self.people_keys():
            raise PlanError(f"Unknown person: {who}")
        if fields.get("date") is not None:
            date.fromisoformat(fields["date"])

    def create_task(self, title: str, who: str | None = None, day: str | None = None) -> dict[str, Any]:
        fields = {"who": who, "date": day}
        self._check_task_fields(fields)
        task = {
            "id": uuid.uuid4().hex,
            "title": title.strip(),
            "who": who,
            "date": day,
            "done": False,
            "created": dt_util.utcnow().isoformat(),
        }
        self._tasks.append(task)
        self._changed()
        return task

    def update_task(self, task_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        task = self._task(task_id)
        self._check_task_fields(patch)
        if "title" in patch:
            patch = {**patch, "title": patch["title"].strip() or task["title"]}
        task.update(patch)
        if "done" in patch:
            task["completed"] = dt_util.utcnow().isoformat() if patch["done"] else None
        self._changed()
        return task

    def delete_task(self, task_id: str) -> None:
        task = self._task(task_id)
        self._tasks.remove(task)
        self._changed()

    # ----- summaries (used by sensors) ---------------------------------

    def open_spots(self, start: date) -> list[dict[str, str]]:
        m = self.members()
        c1, c2 = m[CHILD1]["name"], m[CHILD2]["name"]
        spots: list[dict[str, str]] = []
        for i in range(7):
            d = self.resolve(start + timedelta(days=i))
            checks = []
            if d["child1_school"]:
                checks += [("child1_drop", f"{c1} drop-off"), ("child1_pick", f"{c1} pick-up")]
            if d["child2_daycare"]:
                checks += [("child2_drop", f"{c2} drop-off"), ("child2_pick", f"{c2} pick-up")]
            if d["jj"]:
                checks.append(("jj_who", f"{c1} to jiu jitsu"))
            if d["swim"]:
                checks.append(("swim_who", f"{c1} to swimming"))
            spots += [{"date": d["date"], "item": label} for field, label in checks if not d[field]]
            if not d["dinner_type"]:
                spots.append({"date": d["date"], "item": "Dinner"})
        return spots

    def meal_text(self, d: dict[str, Any]) -> str | None:
        kind = d.get("dinner_type")
        if kind == "mealie":
            return d.get("dinner_meal") or "Home-cooked"
        if kind == "takeout":
            return f"{d['dinner_note']} takeout" if d.get("dinner_note") else "Takeout"
        if kind == "other":
            return d.get("dinner_note") or "Something else"
        return None

    def cooks(self, d: dict[str, Any]) -> list[str]:
        if d.get("dinner_type") == "takeout":
            return []
        cook = d.get("dinner_cook")
        if cook == "both":
            return [ADULT1, ADULT2]
        if cook in (ADULT1, ADULT2):
            return [cook]
        return []
