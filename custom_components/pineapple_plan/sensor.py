"""Sensors so the plan can drive automations and other cards."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_track_time_change
from homeassistant.util import dt as dt_util

from . import PineapplePlanConfigEntry
from .const import DOMAIN, SIGNAL_UPDATED
from .plan import PlanData


async def async_setup_entry(
    hass: HomeAssistant, entry: PineapplePlanConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    plan = entry.runtime_data
    async_add_entities([OpenSpotsSensor(plan), DinnerTonightSensor(plan)])


class _PlanSensor(SensorEntity):
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, plan: PlanData, key: str) -> None:
        self._plan = plan
        self._attr_unique_id = f"{plan.entry.entry_id}_{key}"
        self._attr_translation_key = key
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, plan.entry.entry_id)},
            name="Pineapple Plan",
            entry_type=DeviceEntryType.SERVICE,
        )

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(async_dispatcher_connect(self.hass, SIGNAL_UPDATED, self._refresh))
        # Roll over to the new day (and new week) just after midnight.
        self.async_on_remove(
            async_track_time_change(self.hass, self._midnight, hour=0, minute=0, second=5)
        )

    @callback
    def _refresh(self) -> None:
        self.async_write_ha_state()

    @callback
    def _midnight(self, _now: datetime) -> None:
        self.async_write_ha_state()


class OpenSpotsSensor(_PlanSensor):
    """How many drop-offs, pick-ups, activities and dinners still need someone this week."""

    _attr_icon = "mdi:account-question"
    _attr_native_unit_of_measurement = "spots"

    def __init__(self, plan: PlanData) -> None:
        super().__init__(plan, "open_spots")

    def _spots(self) -> list[dict[str, str]]:
        today = dt_util.now().date()
        return self._plan.open_spots(self._plan.week_start_for(today))

    @property
    def native_value(self) -> int:
        return len(self._spots())

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        return {"spots": self._spots()}


class DinnerTonightSensor(_PlanSensor):
    """Tonight's dinner plan."""

    _attr_icon = "mdi:silverware-fork-knife"

    def __init__(self, plan: PlanData) -> None:
        super().__init__(plan, "dinner_tonight")

    def _today(self) -> dict[str, Any]:
        return self._plan.resolve(dt_util.now().date())

    @property
    def native_value(self) -> str | None:
        return self._plan.meal_text(self._today())

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        day = self._today()
        return {
            "type": day.get("dinner_type"),
            "cooks": [self._plan.person_name(k) for k in self._plan.cooks(day)],
            "recipe_id": day.get("dinner_recipe_id"),
        }
