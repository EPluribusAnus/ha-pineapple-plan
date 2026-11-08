"""Config and options flow for Pineapple Plan."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.selector import (
    BooleanSelector,
    EntitySelector,
    EntitySelectorConfig,
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
    TextSelector,
    TextSelectorConfig,
)

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
    DEFAULTS,
    DOMAIN,
    NOBODY,
    ROLES,
)
from .plan import helper_key

DAY_LABELS = [
    ("sun", "Sunday"),
    ("mon", "Monday"),
    ("tue", "Tuesday"),
    ("wed", "Wednesday"),
    ("thu", "Thursday"),
    ("fri", "Friday"),
    ("sat", "Saturday"),
]
NO_MEALIE = "none"


def _days_selector() -> SelectSelector:
    return SelectSelector(
        SelectSelectorConfig(
            options=[SelectOptionDict(value=v, label=l) for v, l in DAY_LABELS],
            multiple=True,
            mode=SelectSelectorMode.LIST,
        )
    )


def _person_name(hass: HomeAssistant, entity_id: str | None, fallback: str) -> str:
    state = hass.states.get(entity_id) if entity_id else None
    return state.attributes.get("friendly_name", entity_id) if state else fallback


def _clean_helpers(raw: Any) -> list[str]:
    if isinstance(raw, str):
        raw = raw.split(",")
    seen: set[str] = set()
    out: list[str] = []
    for name in raw or []:
        name = str(name).strip()
        if name and helper_key(name) not in seen:
            seen.add(helper_key(name))
            out.append(name)
    return out


def _household_schema(current: dict[str, Any]) -> vol.Schema:
    person = EntitySelector(EntitySelectorConfig(domain="person"))
    return vol.Schema(
        {
            vol.Required(ADULT1, default=current.get(ADULT1, vol.UNDEFINED)): person,
            vol.Required(ADULT2, default=current.get(ADULT2, vol.UNDEFINED)): person,
            vol.Required(CHILD1, default=current.get(CHILD1, vol.UNDEFINED)): person,
            vol.Required(CHILD2, default=current.get(CHILD2, vol.UNDEFINED)): person,
            vol.Optional(CONF_HELPERS, default=current.get(CONF_HELPERS, [])): TextSelector(
                TextSelectorConfig(multiple=True)
            ),
        }
    )


def _defaults_schema(hass: HomeAssistant, current: dict[str, Any]) -> vol.Schema:
    s = {**DEFAULTS, **current}
    drivers = [SelectOptionDict(value=NOBODY, label="Nobody (decide each day)")]
    drivers += [
        SelectOptionDict(value=role, label=_person_name(hass, s.get(role), role))
        for role in (ADULT1, ADULT2)
    ]
    drivers += [
        SelectOptionDict(value=helper_key(name), label=name)
        for name in _clean_helpers(s.get(CONF_HELPERS))
    ]
    driver = SelectSelector(SelectSelectorConfig(options=drivers, mode=SelectSelectorMode.DROPDOWN))

    def who(key: str) -> Any:
        value = s.get(key, NOBODY)
        return value if value in [d["value"] for d in drivers] else NOBODY

    return vol.Schema(
        {
            vol.Required(CONF_WEEK_START, default=s[CONF_WEEK_START]): SelectSelector(
                SelectSelectorConfig(
                    options=[
                        SelectOptionDict(value="sun", label="Sunday"),
                        SelectOptionDict(value="mon", label="Monday"),
                    ],
                    mode=SelectSelectorMode.LIST,
                )
            ),
            vol.Optional(CONF_ADULT1_DAYS, default=s[CONF_ADULT1_DAYS]): _days_selector(),
            vol.Optional(CONF_ADULT1_HOURS, default=s[CONF_ADULT1_HOURS]): TextSelector(),
            vol.Required(CONF_ADULT1_LOCATION, default=s[CONF_ADULT1_LOCATION]): SelectSelector(
                SelectSelectorConfig(
                    options=[
                        SelectOptionDict(value="home", label="Home"),
                        SelectOptionDict(value="office", label="Office"),
                    ],
                    mode=SelectSelectorMode.LIST,
                )
            ),
            vol.Optional(CONF_ADULT2_DAYS, default=s[CONF_ADULT2_DAYS]): _days_selector(),
            vol.Optional(CONF_ADULT2_HOURS, default=s[CONF_ADULT2_HOURS]): TextSelector(),
            vol.Optional(CONF_SCHOOL_DAYS, default=s[CONF_SCHOOL_DAYS]): _days_selector(),
            vol.Required(CONF_CHILD1_DROP, default=who(CONF_CHILD1_DROP)): driver,
            vol.Required(CONF_CHILD1_PICK, default=who(CONF_CHILD1_PICK)): driver,
            vol.Optional(CONF_DAYCARE_DAYS, default=s[CONF_DAYCARE_DAYS]): _days_selector(),
            vol.Required(CONF_CHILD2_DROP, default=who(CONF_CHILD2_DROP)): driver,
            vol.Required(CONF_CHILD2_PICK, default=who(CONF_CHILD2_PICK)): driver,
            vol.Optional(CONF_JJ_DAYS, default=s[CONF_JJ_DAYS]): _days_selector(),
            vol.Required(CONF_JJ_WHO, default=who(CONF_JJ_WHO)): driver,
            vol.Optional(CONF_SWIM_DAYS, default=s[CONF_SWIM_DAYS]): _days_selector(),
            vol.Required(CONF_SWIM_WHO, default=who(CONF_SWIM_WHO)): driver,
        }
    )


def _mealie_schema(hass: HomeAssistant, current: dict[str, Any]) -> vol.Schema | None:
    entries = hass.config_entries.async_entries("mealie")
    if not entries:
        return None
    options = [SelectOptionDict(value=NO_MEALIE, label="Don't use Mealie")]
    options += [SelectOptionDict(value=e.entry_id, label=e.title) for e in entries]
    selected = current.get(CONF_MEALIE_ENTRY) or entries[0].entry_id
    if selected not in [o["value"] for o in options]:
        selected = NO_MEALIE
    return vol.Schema(
        {
            vol.Required(CONF_MEALIE_ENTRY, default=selected): SelectSelector(
                SelectSelectorConfig(options=options, mode=SelectSelectorMode.LIST)
            ),
            vol.Optional(CONF_MEALIE_WRITE, default=current.get(CONF_MEALIE_WRITE, False)): BooleanSelector(),
        }
    )


def _validate_household(user_input: dict[str, Any]) -> dict[str, str]:
    people = [user_input.get(role) for role in ROLES]
    if len(set(people)) != len(people):
        return {"base": "duplicate_person"}
    return {}


class PineapplePlanConfigFlow(ConfigFlow, domain=DOMAIN):
    """Set up the household."""

    VERSION = 1

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = _validate_household(user_input)
            if not errors:
                self._data.update(user_input)
                self._data[CONF_HELPERS] = _clean_helpers(user_input.get(CONF_HELPERS))
                return await self.async_step_defaults()
        return self.async_show_form(
            step_id="user", data_schema=_household_schema(user_input or self._data), errors=errors
        )

    async def async_step_defaults(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            self._data.update(user_input)
            return await self.async_step_mealie()
        return self.async_show_form(step_id="defaults", data_schema=_defaults_schema(self.hass, self._data))

    async def async_step_mealie(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        schema = _mealie_schema(self.hass, self._data)
        if schema is None or user_input is not None:
            if user_input is not None:
                self._data.update(user_input)
            if self._data.get(CONF_MEALIE_ENTRY) in (None, NO_MEALIE):
                self._data[CONF_MEALIE_ENTRY] = None
            return self.async_create_entry(title="Pineapple Plan", data=self._data)
        return self.async_show_form(step_id="mealie", data_schema=schema)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return PineapplePlanOptionsFlow()


class PineapplePlanOptionsFlow(OptionsFlow):
    """Change the household, defaults and Mealie settings later."""

    def __init__(self) -> None:
        self._data: dict[str, Any] = {}

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if not self._data:
            self._data = {**self.config_entry.data, **self.config_entry.options}
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = _validate_household(user_input)
            if not errors:
                self._data.update(user_input)
                self._data[CONF_HELPERS] = _clean_helpers(user_input.get(CONF_HELPERS))
                return await self.async_step_defaults()
        return self.async_show_form(
            step_id="init", data_schema=_household_schema(user_input or self._data), errors=errors
        )

    async def async_step_defaults(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            self._data.update(user_input)
            return await self.async_step_mealie()
        return self.async_show_form(step_id="defaults", data_schema=_defaults_schema(self.hass, self._data))

    async def async_step_mealie(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        schema = _mealie_schema(self.hass, self._data)
        if schema is None or user_input is not None:
            if user_input is not None:
                self._data.update(user_input)
            if self._data.get(CONF_MEALIE_ENTRY) in (None, NO_MEALIE):
                self._data[CONF_MEALIE_ENTRY] = None
            return self.async_create_entry(title="", data=self._data)
        return self.async_show_form(step_id="mealie", data_schema=schema)
