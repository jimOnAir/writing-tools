<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

## Essential Coding Rules

When working with TypeScript classes, always follow these rules:

### Access Modifiers
- **Always add explicit access modifiers** to all class members (methods, properties, constructors)
  - Use `public` for members that are part of the class's public API
  - Use `private` for members used only internally within the class
  - Use `protected` for members that should be accessible to subclasses
  - Never omit access modifiers (rely on default behavior)

### Readonly Modifier
- **Use `readonly` modifier** for class members that are never reassigned after initialization
  - Apply to properties that are set once in the constructor and never changed
  - Apply to injected dependencies that remain constant
  - Do not apply to properties that are reassigned (e.g., window instances, cached data)

### Method Visibility
- **Mark internal-only methods as `private`**
  - If a method is only called from within the same class, it must be `private`
  - Only expose methods that are used by other classes or are part of the public API
  - Helper methods, utility functions, and internal state management should be `private`

### Method Ordering
- **Declare public methods before private methods**
  - Public API methods should come first
  - Private implementation methods should come after public methods
  - This improves readability and follows common TypeScript conventions

### Examples

```typescript
// ✅ Good: Explicit modifiers, readonly for immutable, private for internal
export class MyService {
  private readonly repository: Repository;
  private cache: Data | null = null;

  public constructor(repository: Repository) {
    this.repository = repository;
  }

  public async loadData(): Promise<Data> {
    if (this.cache) {
      return this.cache;
    }
    return this.fetchData();
  }

  private async fetchData(): Promise<Data> {
    return this.repository.get();
  }
}

// ❌ Bad: Missing modifiers, no readonly, public internal method
export class MyService {
  repository: Repository;  // Missing readonly and access modifier
  cache: Data | null = null;

  constructor(repository: Repository) {  // Missing public
    this.repository = repository;
  }

  async loadData(): Promise<Data> {  // Missing public
    if (this.cache) {
      return this.cache;
    }
    return this.fetchData();
  }

  async fetchData(): Promise<Data> {  // Should be private
    return this.repository.get();
  }
}
```

## Lint Fixing Rules

When fixing lint issues, follow these essential rules:

### Promise Handling
- **Always handle promises in event handlers and callbacks**
  - Use `void` operator for async functions in onClick, onKeyDown, etc.
  - Example: `onClick={() => { void handleAsyncFunction(); }}`
  - Never leave promises unhandled in event handlers

### Unused Variables
- **Remove unused variables or prefix with underscore**
  - Remove unused error variables in catch blocks: `catch { }` instead of `catch (err) { }`
  - For destructured values you don't need: `const [, setter] = useState(...)`
  - Prefix with underscore if variable must exist: `const _unused = value;`

### Negated Conditions
- **Prefer explicit comparisons over negated conditions**
  - Use `errorMsg === null` instead of `!errorMsg`
  - Use `value === ''` instead of `!value.trim()`
  - Use `value === undefined` instead of `!value`

### String Concatenation
- **Always use template literals instead of string concatenation**
  - Use `` `${base} ${additional}` `` instead of `base + ' ' + additional`
  - Use `` `${styles.base} ${styles.primary}` `` instead of `styles.base + ' ' + styles.primary`

### React Keys
- **Never use array index as key when items can change**
  - Use composite keys: `key={`${item.id}-${item.name}`}`
  - Convert index to string if needed: `const indexStr = String(index); key={indexStr}`
  - Prefer stable unique identifiers when available

### Form Labels
- **Always associate labels with form controls**
  - Add `htmlFor` attribute to labels matching input `id`
  - Example: `<label htmlFor="input-id">` with `<input id="input-id">`

### Type Imports
- **Never use dynamic `import()` for type annotations**
  - Use `import type { TypeName } from 'package'` instead of `import('package').TypeName`
  - Static type imports are required for proper type checking

### Browser APIs
- **Use `globalThis` prefix for browser-specific types in renderer**
  - Use `globalThis.File` instead of `File` when TypeScript complains about Node.js types
  - Clarifies that it's a browser API, not Node.js

### Variable Shadowing
- **Avoid variable shadowing in nested scopes**
  - Rename variables to avoid shadowing: `const saveSuccess = ...` instead of `const success = ...`
  - Check for variable names already declared in outer scope

### Optional Chaining
- **Prefer optional chaining over conditional checks**
  - Use `e.target.files?.[0]` instead of `e.target.files && e.target.files[0]`
  - More concise and easier to read

### Code Structure and Formatting
- **Maintain proper indentation and nesting**
  - Ensure JSX elements are properly nested and closed
  - Check that opening and closing tags match correctly
  - Verify indentation is consistent (2 spaces per level)
  - When fixing structure, ensure all child elements are properly contained within parent elements

### Import Organization
- **Organize imports in a consistent order**
  - External packages first
  - Internal imports (from project) second
  - Type-only imports use `import type`
  - Group related imports together
  - Example order: React → external packages → project imports → types → styles

### JSX Element Structure
- **Ensure proper JSX element closure and nesting**
  - All JSX elements must be properly closed
  - Check that conditional rendering doesn't break element structure
  - Ensure fragments (`<>...</>`) are used when needed
  - Verify that nested elements maintain proper parent-child relationships

### Examples

```typescript
// ✅ Good: Proper promise handling, explicit conditions, template literals
const handleSave = async () => {
  const saveSuccess = await service.saveSettings();
  if (saveSuccess) {
    alert('Saved!');
  }
};

<button onClick={() => { void handleSave(); }}>
  Save
</button>

const errorMsg = service.validate();
if (errorMsg === null) {
  // success
}

className={`${styles.base} ${styles.primary}`}

{items.map((item) => (
  <div key={`${item.id}-${item.name}`}>
    <label htmlFor={`input-${item.id}`}>Label</label>
    <input id={`input-${item.id}`} />
  </div>
))}

// ❌ Bad: Unhandled promises, negated conditions, string concatenation
const handleSave = async () => {
  const success = await service.saveSettings();  // Variable shadowing
  if (success) {
    alert('Saved!');
  }
};

<button onClick={handleSave}>  // Promise not handled
  Save
</button>

if (!errorMsg) {  // Negated condition
  // success
}

className={styles.base + ' ' + styles.primary}  // String concatenation

{items.map((item, index) => (
  <div key={index}>  // Array index as key
    <label>Label</label>  // No htmlFor
    <input />
  </div>
))}

// ✅ Good: Proper JSX structure and indentation
<div className="mb-4">
  <label htmlFor="input-id" className={TypographyStyles.label}>
    Label
  </label>
  <div className="flex items-center space-x-2">
    <input id="input-id" className={InputStyles} />
  </div>
</div>

// ❌ Bad: Improper nesting and indentation
<div className="mb-4">
  <label htmlFor="input-id" className={TypographyStyles.label}>
    Label
  </label>
<div className="flex items-center space-x-2">  // Wrong indentation
<input id="input-id" className={InputStyles} />
</div>
</div>  // Missing closing tag for label's parent
```

## Styling and Color Palette Rules

When working with styles and colors in the renderer, always follow these essential rules:

### Color Palette Usage
- **Always use `ColorPalette` for all color values**
  - Never hardcode color classes like `text-gray-500`, `bg-blue-600`, etc.
  - Import `ColorPalette` from `../styles/Styles` when needed
  - Use palette values: `ColorPalette.text.primary`, `ColorPalette.background.card`, etc.
  - All colors must be centralized in the `ColorPalette` object

### Centralized Styles
- **Always use centralized style objects from `Styles.tsx`**
  - Use `ButtonStyles`, `InputStyles`, `MessageStyles`, `TypographyStyles`, etc.
  - Import styles from `../styles/Styles`
  - Never create inline style objects or hardcode Tailwind classes
  - Reuse existing style definitions rather than duplicating

### Style Composition
- **Compose styles using template literals**
  - Use template literals to combine multiple style classes
  - Example: `className={`${ButtonStyles.base} ${ButtonStyles.primary}`}`
  - For conditional styles, use ternary operators within template literals

### Style Extraction
- **Extract reusable styles to `Styles.tsx`**
  - When creating new style patterns, add them to the appropriate style object in `Styles.tsx`
  - Group related styles together (BackgroundStyles, ButtonStyles, etc.)
  - Reference `ColorPalette` within style definitions

### Examples

```typescript
// ✅ Good: Using ColorPalette and centralized styles
import { ColorPalette, ButtonStyles, TypographyStyles } from '../styles/Styles';

<div className={`${ColorPalette.text.primary} ${TypographyStyles.h1}`}>
  Title
</div>

<button className={`${ButtonStyles.base} ${ButtonStyles.primary}`}>
  Click me
</button>

<div className={`${ColorPalette.background.card} ${ColorPalette.border.defaultLight}`}>
  Content
</div>

// ❌ Bad: Hardcoded colors and inline styles
<div className="text-white text-xl font-medium mb-4">
  Title
</div>

<button className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white">
  Click me
</button>

<div className="bg-gray-800/40 border border-gray-700/30">
  Content
</div>

// ✅ Good: Conditional styles with palette
<button
  className={`${ButtonStyles.base} ${
    isDisabled ? ButtonStyles.disabled : ButtonStyles.primary
  }`}
>
  Submit
</button>

// ❌ Bad: Hardcoded conditional colors
<button
  className={`px-4 py-2 rounded ${
    isDisabled ? 'bg-gray-400 text-gray-200' : 'bg-blue-600 text-white'
  }`}
>
  Submit
</button>
```
