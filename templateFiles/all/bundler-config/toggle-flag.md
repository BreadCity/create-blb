<!--
  Reading this in a text editor?
  Visit https://github.com/BreadCity/create-blb/blob/main/templateFiles/all/bundler-config/toggle-flag.md in a browser to see this rendered as markdown
-->

> If this file isn't present, \`-- toggle prod/dev only mode\` will no longer toggle code removal.
>
> An example of this functionality is provided below:

### Example input

```lua
print 'a'
-- toggle prod only mode
print 'b'
-- toggle prod only mode
print 'c'
-- toggle dev only mode
print 'd'
-- toggle dev only mode
print 'e'
```

### Example output in dev with `toggle-flag.md`:

```lua
print 'a'
-- removed prod-only code
print 'c'
-- toggle dev only mode
print 'd'
-- toggle dev only mode
print 'e'
```

### Example output in prod with this `toggle-flag.md`:

```lua
print 'a'
-- removed prod-only code
print 'c'
-- toggle dev only mode
print 'd'
-- toggle dev only mode
print 'e'
```

### Example output in dev/prod without this `toggle-flag.md`:

```lua
print 'a'
-- toggle prod only mode
print 'b'
-- toggle prod only mode
print 'c'
-- toggle dev only mode
print 'd'
-- toggle dev only mode
print 'e'
```