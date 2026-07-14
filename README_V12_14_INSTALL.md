# Brian English Studio V12.14.0

This release restores the navigation and menu arrangement used in V11 while retaining all V12 functionality.

## Independent test

```bash
npm ci
npm run verify:v12.14.0
npm run dev
```

## Visual acceptance checklist

1. The status bar appears at the top.
2. The V11 flat menu/navigation appears directly below it.
3. Workspace tabs appear as their own row below the menu.
4. The V12 eight-workspace navigation no longer replaces the V11 menu.
5. Activity Center, Command Center and Workspace Layout remain available.
