"""Pineapple Plan: plan the family's week together in Home Assistant."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from . import websocket
from .const import CARD_FILENAME, CARD_URL, DOMAIN, VERSION
from .plan import PlanData

_LOGGER = logging.getLogger(__name__)

PLATFORMS = [Platform.SENSOR]
CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type PineapplePlanConfigEntry = ConfigEntry[PlanData]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the websocket API and serve the Lovelace card."""
    hass.data.setdefault(DOMAIN, {})
    websocket.async_register(hass)

    card_path = Path(__file__).parent / "frontend" / CARD_FILENAME
    await hass.http.async_register_static_paths(
        [StaticPathConfig(CARD_URL, str(card_path), False)]
    )
    # Load the card on every dashboard so no manual resource setup is needed.
    add_extra_js_url(hass, f"{CARD_URL}?v={VERSION}")
    return True


async def async_setup_entry(hass: HomeAssistant, entry: PineapplePlanConfigEntry) -> bool:
    """Set up Pineapple Plan from a config entry."""
    plan = PlanData(hass, entry)
    await plan.async_load()
    entry.runtime_data = plan
    hass.data[DOMAIN]["plan"] = plan

    entry.async_on_unload(entry.add_update_listener(_async_update_listener))
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    plan.notify()
    return True


async def _async_update_listener(hass: HomeAssistant, entry: PineapplePlanConfigEntry) -> None:
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: PineapplePlanConfigEntry) -> bool:
    """Unload a config entry."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        plan: PlanData | None = hass.data[DOMAIN].pop("plan", None)
        if plan is not None:
            await plan.async_flush()
    return unloaded
