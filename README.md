# Pineapple Plan

A Home Assistant integration and dashboard card for planning the family's week together:

- **Work:** whether each adult works, their hours, and whether Adult 1 is home or at the office.
- **School & daycare:** whether there's school or daycare, and who handles each drop-off and pick-up.
- **Activities:** jiu jitsu and swimming, and who's taking them.
- **Dinner:** who's cooking (Adult 1, Adult 2, both, nobody) and what it is: a recipe from Mealie, takeout (no cook needed), or something else.
- **Tasks:** a task inbox for to-dos without a day. Drag them onto a day (or tap one to pick a day and a person) and check them off.

Helpers outside the household (grandparents, sitters…) can be assigned drop-offs, pick-ups and activities without a Home Assistant account.

## Install

**HACS:** add this repository as a custom repository (type *Integration*), install **Pineapple Plan**, then restart Home Assistant.

**Manually:** copy `custom_components/pineapple_plan` into your Home Assistant `config/custom_components/` folder and restart.

Then go to **Settings → Devices & services → Add integration → Pineapple Plan**:

1. **Your household:** pick the Home Assistant person for each role and list any helpers.
2. **A typical week:** which day the week starts, work days and hours, school, daycare and activity days, and who usually handles each run. Every day starts from these defaults, so you only change the exceptions.
3. **Dinner recipes:** shown only if the Mealie integration is set up.

Change any of this later with **Configure** on the integration.

## Add the card

The card loads automatically; you don't need to add a resource. Edit a dashboard, add a card, and pick **Pineapple Plan**, or use YAML:

```yaml
type: custom:pineapple-plan-card
```

It works best as a full-width card, for example in a **Panel** view or a full-width section.

| Option    | Default  | What it does |
|-----------|----------|--------------|
| `title`   | `Pineapple Plan` | Header title. |
| `summary` | `auto`   | Header summary button. `auto`: "Your week" for household members, a whole-household "This week" summary for anyone else (like a kitchen kiosk account). `household`: always show the household summary. `hidden`: no summary button. |
| `theme`   | follows HA | `light` or `dark` to force a theme. Otherwise it follows Home Assistant's dark mode. |
| `height`  | none     | Maximum height of each day column (for example `640px`); columns scroll inside. |
| `fonts`   | `true`   | `false` uses your Home Assistant theme's font instead of loading Inter and Bricolage Grotesque from Google Fonts. |

For a kitchen kiosk:

```yaml
type: custom:pineapple-plan-card
summary: household
```

### Layout

The card lays itself out by its own width: one day at a time on a phone (swipe, or use the arrows), 3 or 5 days on mid-size screens (scrolls continuously), and the whole week on wide screens. On tablets and desktops the task inbox is a collapsible sidebar, closed by default.

## Entities

- `sensor.pineapple_plan_open_spots`: how many drop-offs, pick-ups, activities and dinners still need someone this week. The `spots` attribute lists them.
- `sensor.pineapple_plan_dinner_tonight`: tonight's dinner, with `type`, `cooks` and `recipe_id` attributes.

Example automation idea: a Sunday-evening notification when `open_spots` is above 0.

## Mealie

Recipes come from Home Assistant's built-in Mealie integration (its `mealie.get_recipes` action, available in recent Home Assistant versions). With **Also add planned dinners to the Mealie meal plan** on, picking a recipe also calls `mealie.set_mealplan` for that date. Changing the recipe later adds another entry rather than replacing the first, so it's off by default.

## Data

The plan is stored in Home Assistant's `.storage/pineapple_plan.<entry_id>` file. Only days you've changed are stored. Everything else comes from the weekly defaults, so changing a default updates every day you haven't touched.
