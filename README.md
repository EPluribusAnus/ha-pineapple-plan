# Pineapple Plan

A Home Assistant integration and dashboard card for planning the family's week together:

- **Work:** whether each adult works, their hours, and whether Adult 1 is home or at the office.
- **School & daycare:** whether there's school or daycare, and who handles each drop-off and pick-up.
- **Activities:** jiu jitsu and swimming, and who's taking them.
- **Dinner:** who's cooking (Adult 1, Adult 2, both, nobody) and what it is: a recipe from Mealie, takeout (no cook needed), or something else.
- **Tasks:** a task inbox for to-dos without a day. Drag them onto a day (or tap one to pick a day and a person) and check them off.

Helpers outside the household (grandparents, sitters…) can be assigned drop-offs, pick-ups and activities without a Home Assistant account.

## Install

**HACS:** in HACS, open the ⋮ menu → **Custom repositories**, add `https://github.com/EPluribusAnus/ha-pineapple-plan` with type **Integration**, install **Pineapple Plan**, then restart Home Assistant.

**Manually:** copy `custom_components/pineapple_plan` into your Home Assistant `config/custom_components/` folder and restart.

Then go to **Settings → Devices & services → Add integration → Pineapple Plan**:

1. **Your household:** pick the Home Assistant person for each role and list any helpers.
2. **A typical week:** which day the week starts, work days and hours, school, daycare and activity days, and who usually handles each run. Every day starts from these defaults, so you only change the exceptions.
3. **Dinner recipes:** shown only if the Mealie integration is set up.

Change any of this later with **Configure** on the integration.

## Add the cards

There are two cards. Both use your Home Assistant theme (card background, text colours, dividers, accent and primary colour, font), so they blend in with the rest of your dashboard in light and dark mode. Each person keeps their own colour so you can tell who's who.

### Planner

The card loads automatically; you don't need to add a resource. Edit a dashboard, add a card, and pick **Pineapple Plan**, or use YAML:

```yaml
type: custom:pineapple-plan-card
```

It works best as a full-width card. In a **Panel** view it fills the whole screen height.

| Option    | Default  | What it does |
|-----------|----------|--------------|
| `title`   | `Pineapple Plan` | Header title. |
| `summary` | `auto`   | Header summary button. `auto`: "Your week" for household members, a whole-household "This week" summary for anyone else (like a kitchen kiosk account). `household`: always show the household summary. `hidden`: no summary button. |
| `accent`  | theme accent | Colour of the title (any CSS colour). Defaults to your theme's `accent-color`. |
| `height`  | none     | Maximum height of each day column (for example `640px`); columns scroll inside. |
| `fill`    | `false`  | `true` stretches the card to the full screen height even outside a Panel view. |
| `palette` | theme    | `pineapple` switches to the original green-and-gold look with its own fonts (Inter and Bricolage Grotesque from Google Fonts) and follows Home Assistant's dark mode. |

For a kitchen kiosk:

```yaml
type: custom:pineapple-plan-card
summary: household
```

#### Layout

The card lays itself out by its own width: one day at a time on a phone (swipe, or use the arrows), 3 or 5 days on mid-size screens (scrolls continuously), and the whole week on wide screens. On tablets and desktops the task inbox is a collapsible sidebar, closed by default.

Each day only shows what applies (who's working, school or daycare runs, activities). Tap the date or any section to plan the day, including turning things back on. **+ Task** on a day opens the inbox so you can pick an existing task or type a new one for that day. Dragging tasks onto a day works too.

### Today

A compact summary of the day that fits where a calendar card would:

```yaml
type: custom:pineapple-plan-today-card
weather_entity: weather.home
```

It shows the date, each child's school or daycare run with who's dropping off and picking up, activities and who's taking them, who's working and when (and whether Adult 1 is home or at the office), dinner and who's cooking, and that day's tasks, which you can check off. Anything that still needs someone shows a **Who?** chip, and the header counts open spots. Only what applies that day is shown.

Swipe, or tap the dots, to see tomorrow. Tap any line to open that day's editor, or a task to edit it.

| Option            | Default | What it does |
|-------------------|---------|--------------|
| `weather_entity`  | none    | A weather entity to show the current conditions and temperature in the header. |
| `navigation_path` | none    | Tapping the title opens this dashboard path (for example `/dashboard-family/planner`) instead of the day editor. |
| `tomorrow`        | `true`  | `false` hides the dots and the swipe to tomorrow. |
| `max_tasks`       | `4`     | How many open tasks to show before "+N more". |
| `accent`          | theme accent | Colour of the title and date bar. |

## Entities

- `sensor.pineapple_plan_open_spots`: how many drop-offs, pick-ups, activities and dinners still need someone this week. The `spots` attribute lists them.
- `sensor.pineapple_plan_dinner_tonight`: tonight's dinner, with `type`, `cooks` and `recipe_id` attributes.

Example automation idea: a Sunday-evening notification when `open_spots` is above 0.

## Mealie

Recipes come from Home Assistant's built-in Mealie integration (its `mealie.get_recipes` action, available in recent Home Assistant versions). With **Also add planned dinners to the Mealie meal plan** on, picking a recipe also calls `mealie.set_mealplan` for that date. Changing the recipe later adds another entry rather than replacing the first, so it's off by default.

## Data

The plan is stored in Home Assistant's `.storage/pineapple_plan.<entry_id>` file. Only days you've changed are stored. Everything else comes from the weekly defaults, so changing a default updates every day you haven't touched.
