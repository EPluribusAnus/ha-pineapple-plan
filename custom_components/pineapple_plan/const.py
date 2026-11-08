"""Constants for Pineapple Plan."""

from __future__ import annotations

DOMAIN = "pineapple_plan"
VERSION = "0.2.2"

SIGNAL_UPDATED = f"{DOMAIN}_updated"
STORAGE_VERSION = 1

CARD_FILENAME = "pineapple-plan-card.js"
CARD_URL = f"/{DOMAIN}/{CARD_FILENAME}"

# Household roles. Each one is linked to a Home Assistant person entity.
ADULT1 = "adult1"
ADULT2 = "adult2"
CHILD1 = "child1"
CHILD2 = "child2"
ROLES = [ADULT1, ADULT2, CHILD1, CHILD2]

DEFAULT_COLORS = {
    ADULT1: "#2F62C8",
    ADULT2: "#B4501B",
    CHILD1: "#7347BF",
    CHILD2: "#0E7A6D",
}
HELPER_COLORS = ["#9A3E62", "#596628", "#8A5A00", "#3E6B8A", "#6B4E9A", "#7A4B2A"]

WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

# Config entry keys
CONF_HELPERS = "helpers"
CONF_WEEK_START = "week_start"
CONF_ADULT1_DAYS = "adult1_workdays"
CONF_ADULT1_HOURS = "adult1_hours"
CONF_ADULT1_LOCATION = "adult1_location"
CONF_ADULT2_DAYS = "adult2_workdays"
CONF_ADULT2_HOURS = "adult2_hours"
CONF_SCHOOL_DAYS = "school_days"
CONF_DAYCARE_DAYS = "daycare_days"
CONF_JJ_DAYS = "jj_days"
CONF_SWIM_DAYS = "swim_days"
CONF_CHILD1_DROP = "default_child1_drop"
CONF_CHILD1_PICK = "default_child1_pick"
CONF_CHILD2_DROP = "default_child2_drop"
CONF_CHILD2_PICK = "default_child2_pick"
CONF_JJ_WHO = "default_jj_who"
CONF_SWIM_WHO = "default_swim_who"
CONF_MEALIE_ENTRY = "mealie_entry_id"
CONF_MEALIE_WRITE = "mealie_write_back"

NOBODY = "none"

DEFAULTS = {
    CONF_HELPERS: [],
    CONF_WEEK_START: "sun",
    CONF_ADULT1_DAYS: ["mon", "tue", "wed", "thu", "fri"],
    CONF_ADULT1_HOURS: "9–5",
    CONF_ADULT1_LOCATION: "home",
    CONF_ADULT2_DAYS: ["mon", "tue", "wed", "thu", "fri"],
    CONF_ADULT2_HOURS: "9–5",
    CONF_SCHOOL_DAYS: ["mon", "tue", "wed", "thu", "fri"],
    CONF_DAYCARE_DAYS: ["mon", "tue", "wed", "thu", "fri"],
    CONF_JJ_DAYS: [],
    CONF_SWIM_DAYS: [],
    CONF_CHILD1_DROP: NOBODY,
    CONF_CHILD1_PICK: NOBODY,
    CONF_CHILD2_DROP: NOBODY,
    CONF_CHILD2_PICK: NOBODY,
    CONF_JJ_WHO: NOBODY,
    CONF_SWIM_WHO: NOBODY,
    CONF_MEALIE_ENTRY: None,
    CONF_MEALIE_WRITE: False,
}

# Fields a single day can carry. Values not stored for a day come from the defaults.
DAY_FIELDS = [
    "adult1_works",
    "adult1_hours",
    "adult1_location",
    "adult2_works",
    "adult2_hours",
    "child1_school",
    "child2_daycare",
    "child1_drop",
    "child1_pick",
    "child2_drop",
    "child2_pick",
    "jj",
    "jj_who",
    "swim",
    "swim_who",
    "dinner_cook",
    "dinner_type",
    "dinner_recipe_id",
    "dinner_meal",
    "dinner_note",
]
PERSON_FIELDS = ["child1_drop", "child1_pick", "child2_drop", "child2_pick", "jj_who", "swim_who"]
