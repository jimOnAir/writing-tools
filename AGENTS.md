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

### Enum Key Ordering
- **Always sort enum keys alphabetically**
  - All enum members must be in alphabetical order
  - This ensures consistency and makes it easier to find specific enum values
  - Apply to all enums: event enums, channel enums, status enums, etc.

### Object Property Ordering
- **Always sort object properties alphabetically**
  - All object properties must be in alphabetical order
  - This ensures consistency and makes it easier to find specific properties
  - Apply to all object literals: configuration objects, style objects, type definitions, etc.
  - Exception: When object properties have logical grouping (e.g., related properties together), maintain that grouping but sort within each group

### Conditional Type Ordering
- **Always sort conditions alphabetically in conditional types**
  - All condition checks in conditional types must be in alphabetical order
  - This ensures consistency and makes it easier to find specific type conditions
  - Apply to all conditional types: `K extends EIpcEvent.CHAT_DELETE ? ... : K extends EIpcEvent.CHAT_GET ? ... : never`

### Mapped Type Ordering
- **Always sort properties alphabetically in mapped types**
  - All properties in mapped types must be in alphabetical order
  - This ensures consistency and makes it easier to find specific mapped properties
  - Apply to all mapped types: `{ [K in keyof T]: ... }` and similar patterns

### Enum Key Completeness Checking
- **Use type helpers to ensure all enum keys are used in mapped types**
  - Create a mapped type that maps every enum value to its corresponding type
  - Use `TEnsureAllKeysMap` helper type to verify all enum keys are present at compile time
  - This provides type safety and prevents missing enum values in mappings
  - Apply to all enum-to-type mappings: event payloads, response types, setting types, etc.

### Examples

#### Enum and Object Ordering Examples

```typescript
// ✅ Good: Enum keys sorted alphabetically
export enum EIpcEvent {
  CHAT_CREATE_SESSION = 'CHAT_CREATE_SESSION',
  CHAT_DELETE = 'CHAT_DELETE',
  CHAT_GET = 'CHAT_GET',
  ENV_GET = 'ENV_GET',
  MODEL_LIST = 'MODEL_LIST',
}

// ❌ Bad: Enum keys not sorted
export enum EIpcEvent {
  CHAT_GET = 'CHAT_GET',
  ENV_GET = 'ENV_GET',
  CHAT_DELETE = 'CHAT_DELETE',  // Out of order
  MODEL_LIST = 'MODEL_LIST',
  CHAT_CREATE_SESSION = 'CHAT_CREATE_SESSION',  // Out of order
}

// ✅ Good: Object properties sorted alphabetically
const config = {
  apiKey: 'key',
  endpoint: 'https://api.example.com',
  timeout: 5000,
  version: '1.0',
};

// ❌ Bad: Object properties not sorted
const config = {
  endpoint: 'https://api.example.com',
  apiKey: 'key',  // Out of order
  version: '1.0',
  timeout: 5000,  // Out of order
}

// ✅ Good: Grouped properties, sorted within groups
const styles = {
  // Background group
  background: {
    card: 'bg-gray-800',
    main: 'bg-gray-900',
  },
  // Border group
  border: {
    default: 'border-gray-700',
    light: 'border-gray-600',
  },
  // Text group
  text: {
    muted: 'text-gray-400',
    primary: 'text-white',
  },
};

// ✅ Good: Conditional type conditions sorted alphabetically
export type TIpcResponsePayload<K extends EIpcEvent> =
  K extends EIpcEvent.CHAT_DELETE ? TChatDeleteResponse :
  K extends EIpcEvent.CHAT_GET ? TChatGetResponse :
  K extends EIpcEvent.CHAT_OPEN ? TChatOpenResponse :
  K extends EIpcEvent.ENV_GET ? TEnvGetResponse :
  K extends EIpcEvent.MODEL_LIST ? TModelListResponse :
  never;

// ❌ Bad: Conditional type conditions not sorted
export type TIpcResponsePayload<K extends EIpcEvent> =
  K extends EIpcEvent.CHAT_GET ? TChatGetResponse :
  K extends EIpcEvent.ENV_GET ? TEnvGetResponse :
  K extends EIpcEvent.CHAT_DELETE ? TChatDeleteResponse :  // Out of order
  K extends EIpcEvent.MODEL_LIST ? TModelListResponse :
  K extends EIpcEvent.CHAT_OPEN ? TChatOpenResponse :  // Out of order
  never;

// ✅ Good: Mapped type properties sorted alphabetically
type Optional<T> = {
  [K in keyof T as K extends 'id' ? never : K]?: T[K];
};

// ✅ Good: Interface properties sorted alphabetically (applies to mapped types too)
interface IChatWindowData {
  chatId?: number;
  prompt: string;
}

// ❌ Bad: Interface properties not sorted
interface IChatWindowData {
  prompt: string;
  chatId?: number;  // Out of order
}

// ✅ Good: Use type helper to ensure all enum keys are mapped
export type TEnsureAllKeysMap<E extends string | number, M extends Record<E, any>> = M;

export type TIpcEventPayloadMap = {
  [EIpcEvent.CHAT_CREATE_SESSION]: TChatCreateSessionPayload,
  [EIpcEvent.CHAT_DELETE]: TChatDeletePayload,
  [EIpcEvent.CHAT_GET]: TChatGetPayload,
  [EIpcEvent.CHAT_LIST_CHATS]: TChatListChatsPayload,
  [EIpcEvent.CHAT_LOAD_MESSAGES]: TChatLoadMessagesPayload,
  [EIpcEvent.CHAT_OPEN]: TChatOpenPayload,
  [EIpcEvent.CHAT_SEND_MESSAGE]: TChatSendMessagePayload,
  [EIpcEvent.ENV_GET]: TEnvGetPayload,
  [EIpcEvent.MODEL_LIST]: TModelListPayload,
  [EIpcEvent.PROMPT_SELECT]: TPromptSelectPayload,
  [EIpcEvent.SETTINGS_LOAD]: TSettingsLoadPayload,
  [EIpcEvent.SETTINGS_SAVE]: TSettingsSavePayload,
};

type TCheckedMap = TEnsureAllKeysMap<EIpcEvent, TIpcEventPayloadMap>;

export type TIpcEventPayload<K extends EIpcEvent> = TCheckedMap[K];

// ❌ Bad: Missing type safety - no guarantee all enum keys are mapped
export type TIpcEventPayload<K extends EIpcEvent> =
  K extends EIpcEvent.CHAT_DELETE ? TChatDeletePayload :
  K extends EIpcEvent.CHAT_GET ? TChatGetPayload :
  // Missing other enum values - no compile-time error!
  never;
```

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

### Button Text Naming
- **Use consistent naming for button labels**
  - Use "Remove" for delete/remove actions (not "Delete")
  - Use "Removing..." for delete/remove action loading states
  - This ensures consistency across the application
  - Example: `<button>Remove</button>` instead of `<button>Delete</button>`

### Button Style Consistency
- **Use consistent button styles for similar actions across components**
  - Remove/delete buttons should use `${ButtonStyles.base} ${ButtonStyles.ghost}` pattern
  - Always include `whitespace-nowrap` for button text to prevent wrapping
  - Match button styling patterns from Settings component for consistency
  - Example: `<button className={`${ButtonStyles.base} ${ButtonStyles.ghost} whitespace-nowrap`}>Remove</button>`

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

## IPC Response Handling

When processing IPC responses, always use the centralized type guard functions from `utils/responseTypeGuards.ts`:

### Type Guard Functions
- **`isErrorResponse(response: unknown): response is { error: string }`**
  - Checks if a response has an `error` property with a string value
  - Use for responses that may have an `error` property (e.g., `TChatListChatsResponse`, `TChatSendMessageResponse`)

- **`isFailedResponse(response: unknown): response is { error: string, success: false }`**
  - Checks if a response has `success: false` and an `error` property with a string value
  - Use for responses that have a `success` property (e.g., `TChatOpenResponse`, `TChatDeleteResponse`, `TSettingsSaveResponse`)

### Usage Pattern
Always use these type guards instead of direct property checks to ensure type safety and consistency:

```typescript
// ✅ Good: Using type guards from utils
import { isErrorResponse, isFailedResponse } from '../utils/responseTypeGuards';

const response = await ipcAdapter.invoke(EIpcChannel.CHAT, payload);

if (isErrorResponse(response)) {
  throw new Error(response.error);
}

// Or for success-based responses
if (isFailedResponse(response)) {
  throw new Error(response.error);
}
```

```typescript
// ❌ Bad: Direct property checks without type guards
const response = await ipcAdapter.invoke(EIpcChannel.CHAT, payload);

if ('error' in response) {
  throw new Error(response.error); // TypeScript may not properly narrow the type
}
```

### Benefits
- **Type Safety**: TypeScript properly narrows the response type after the guard check
- **Consistency**: All components use the same error checking logic
- **Maintainability**: Error checking logic is centralized in one place
- **Lint Compliance**: Avoids unsafe assignment and member access lint errors

### When to Use Which Guard
- Use `isErrorResponse` for responses like:
  - `TChatListChatsResponse` (has `error` or `chats`)
  - `TChatSendMessageResponse` (has `error` or `response`)
  - `TChatGetResponse` (has `error` or `chat`)
  - `TChatLoadMessagesResponse` (has `error` or `messages`)

- Use `isFailedResponse` for responses like:
  - `TChatOpenResponse` (has `success: true` or `success: false, error`)
  - `TChatDeleteResponse` (has `success: true` or `success: false, error`)
  - `TSettingsSaveResponse` (has `success: true` or `success: false, error`)

## IPC Handling Architecture

**All IPC communication must be handled in services, not in components.**

**Services must be provided through props, not instantiated in components.**

### Service Pattern
- **Services handle all IPC calls** - Components should never directly call `ipcAdapter.invoke()`
- **Services manage state** - Services maintain internal state and notify components via callbacks
- **Services are provided through props** - Components receive services as props, never instantiate them
- **Services encapsulate business logic** - All domain logic, error handling, and IPC communication belongs in services
- **Service instantiation at app level** - Services are created in `App.tsx` (or top-level component) and passed down

### Service Structure
Services should follow this pattern:

```typescript
// ✅ Good: Service handles IPC and state management
export class ChatListService {
  private readonly ipcAdapter: IIpcAdapter;
  private chats: IChatInfo[] = [];
  private isLoading = false;
  private error: string | null = null;

  // Callbacks for component state updates
  private onChatsChange?: (chats: IChatInfo[]) => void;
  private onLoadingChange?: (isLoading: boolean) => void;
  private onErrorChange?: (error: string | null) => void;

  public constructor(ipcAdapter: IIpcAdapter) {
    this.ipcAdapter = ipcAdapter;
  }

  public setCallbacks(callbacks: {
    onChatsChange?: (chats: IChatInfo[]) => void,
    onLoadingChange?: (isLoading: boolean) => void,
    onErrorChange?: (error: string | null) => void,
  }): void {
    this.onChatsChange = callbacks.onChatsChange;
    this.onLoadingChange = callbacks.onLoadingChange;
    this.onErrorChange = callbacks.onErrorChange;
  }

  public async loadChats(): Promise<void> {
    this.setLoading(true);
    this.setError(null);

    try {
      const payload: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LIST_CHATS> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_LIST_CHATS,
        payload: {},
      };

      const response = await this.ipcAdapter.invoke(EIpcChannel.CHAT, payload);

      if (isErrorResponse(response)) {
        throw new Error(response.error);
      }

      if ('chats' in response && Array.isArray(response.chats)) {
        this.setChats(response.chats);
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : String(err);
      logger.error('Failed to load chats: %s', errorText);
      this.setError(errorText);
    } finally {
      this.setLoading(false);
    }
  }

  private setChats(chats: IChatInfo[]): void {
    this.chats = chats;
    this.onChatsChange?.(chats);
  }

  private setLoading(isLoading: boolean): void {
    this.isLoading = isLoading;
    this.onLoadingChange?.(isLoading);
  }

  private setError(error: string | null): void {
    this.error = error;
    this.onErrorChange?.(error);
  }
}
```

### Component Pattern
Components should receive services as props, not instantiate them:

```typescript
// ✅ Good: Component receives service as prop
interface ChatListComponentProps {
  chatListService: ChatListService;
}

const ChatListComponent: React.FC<ChatListComponentProps> = ({ chatListService }) => {
  const [chats, setChats] = useState<IChatInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Register callbacks
  useEffect(() => {
    chatListService.setCallbacks({
      onChatsChange: setChats,
      onLoadingChange: setIsLoading,
      onErrorChange: setError,
    });
  }, [chatListService]);

  useEffect(() => {
    void chatListService.loadChats();
  }, [chatListService]);

  const handleOpenChat = async (chatId: number) => {
    await chatListService.openChat(chatId);
  };

  return (
    // Component JSX
  );
};
```

### Service Instantiation Pattern
**Services must be instantiated at the application level (e.g., in `App.tsx`) and passed down as props.**

This pattern provides dependency injection, making components more testable and flexible:

```typescript
// ✅ Good: Services instantiated in App, passed as props
function App() {
  // Create shared IPC adapter
  const ipcAdapter = useMemo(() => new ElectronIpcAdapter(), []);

  // Create service instances
  const chatService = useMemo(() => new ChatService(ipcAdapter), [ipcAdapter]);
  const chatListService = useMemo(() => new ChatListService(ipcAdapter), [ipcAdapter]);
  const settingsService = useMemo(() => new SettingsService(ipcAdapter), [ipcAdapter]);
  const promptSelectorService = useMemo(() => new PromptSelectorService(ipcAdapter), [ipcAdapter]);

  if (view === 'chat-list') {
    return <ChatListComponent chatListService={chatListService} />;
  }

  if (view === 'settings') {
    return <Settings settingsService={settingsService} />;
  }

  return <ChatComponent chatService={chatService} />;
}
```

**Key Rules:**
- ✅ Services are instantiated in `App.tsx` (or top-level component)
- ✅ Services are passed to components via props
- ✅ Components receive services through props interface
- ✅ Use `useMemo` to prevent unnecessary service re-instantiation
- ❌ Never instantiate services inside components
- ❌ Never use `useMemo` to create services inside components

```typescript
// ❌ Bad: Component instantiates service
const ChatListComponent: React.FC = () => {
  const chatListService = useMemo(() => {
    const ipcAdapter = new ElectronIpcAdapter();
    return new ChatListService(ipcAdapter);
  }, []);
  // Service instantiation in component - WRONG! Services must come from props.
};

// ❌ Bad: Component creates IPC adapter
const ChatListComponent: React.FC = () => {
  const ipcAdapter = useMemo(() => new ElectronIpcAdapter(), []);
  // IPC adapter should be created in App, not in components.
};

// ❌ Bad: Component directly calls IPC
const ChatListComponent: React.FC = () => {
  const [chats, setChats] = useState<IChatInfo[]>([]);
  const ipcAdapter = useMemo(() => new ElectronIpcAdapter(), []);

  const loadChats = async () => {
    const payload: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LIST_CHATS> = {
      channel: EIpcChannel.CHAT,
      event: EIpcEvent.CHAT_LIST_CHATS,
      payload: {},
    };

    const response = await ipcAdapter.invoke(EIpcChannel.CHAT, payload);
    // Direct IPC handling in component - WRONG!
  };
};
```

### Benefits
- **Separation of Concerns**: Business logic is separated from UI logic
- **Reusability**: Services can be reused across multiple components
- **Testability**: Services can be tested independently of components, and components can be tested with mock services passed as props
- **Maintainability**: IPC handling is centralized in services
- **Type Safety**: Services provide type-safe interfaces for components
- **Dependency Injection**: Services are injected via props, making components more testable and flexible
- **Single Responsibility**: Components focus on rendering, services handle business logic
- **Lifecycle Management**: Service instances are managed at the application level, ensuring proper initialization and cleanup
- **Shared State**: Services can be shared between components when needed (e.g., same IPC adapter instance)

### Testing with Dependency Injection
When services are provided via props, testing becomes much easier:

```typescript
// ✅ Good: Component can be tested with mock service
describe('ChatListComponent', () => {
  it('should load chats on mount', () => {
    const mockService = {
      setCallbacks: jest.fn(),
      loadChats: jest.fn(),
      openChat: jest.fn(),
      deleteChat: jest.fn(),
    };

    render(<ChatListComponent chatListService={mockService as unknown as ChatListService} />);

    expect(mockService.setCallbacks).toHaveBeenCalled();
    expect(mockService.loadChats).toHaveBeenCalled();
  });
});
```

### Service Responsibilities
Services should handle:
- ✅ All IPC communication (`ipcAdapter.invoke()`)
- ✅ State management (internal state + callbacks)
- ✅ Error handling and logging
- ✅ Business logic and data transformation
- ✅ Response validation using type guards

Components should handle:
- ✅ UI rendering and user interactions
- ✅ Local UI state (form inputs, temporary UI state)
- ✅ Calling service methods
- ✅ Registering service callbacks

## React Performance Optimization

When optimizing React components, follow these essential practices:

### Memoization Hooks

- **Use `useMemo` for expensive computations** - Memoize values that are expensive to compute
  - Only recompute when dependencies change
  - Use for derived state, filtered lists, and complex calculations
  - Don't overuse - profile first to identify actual bottlenecks

```typescript
// ✅ Good: Memoizing expensive computation
const filteredItems = useMemo(() => {
  return items.filter(item => item.category === selectedCategory);
}, [items, selectedCategory]);

// ❌ Bad: Recomputing on every render
const filteredItems = items.filter(item => item.category === selectedCategory);
```

- **Use `useCallback` for stable function references** - Memoize callbacks passed to child components
  - Prevents unnecessary re-renders of memoized child components
  - Use when passing functions as props to `React.memo` components
  - Include all dependencies in the dependency array

```typescript
// ✅ Good: Memoized callback with React.memo
const MemoizedChild = React.memo(({ onClick }: { onClick: () => void }) => {
  return <button onClick={onClick}>Click</button>;
});

const Parent = () => {
  const handleClick = useCallback(() => {
    console.log('Clicked');
  }, []);  // Stable reference

  return <MemoizedChild onClick={handleClick} />;
};

// ❌ Bad: New function on every render
const Parent = () => {
  const handleClick = () => {  // New function every render
    console.log('Clicked');
  };

  return <MemoizedChild onClick={handleClick} />;  // Causes re-render
};
```

- **Use `React.memo` for component memoization** - Prevent re-renders when props haven't changed
  - Use for components that render frequently with same props
  - Combine with `useCallback` for function props
  - Don't use for components that always receive new props

```typescript
// ✅ Good: Memoized component
const ExpensiveComponent = React.memo(({ data }: { data: IData }) => {
  return <div>{/* Expensive rendering */}</div>;
});

// ❌ Bad: Unnecessary memoization
const SimpleComponent = React.memo(({ text }: { text: string }) => {
  return <div>{text}</div>;  // Too simple to benefit
});
```

### Dependency Array Management

- **Ensure complete and accurate dependency arrays** - Include all values used in the hook
  - Missing dependencies can cause stale closures and bugs
  - Use ESLint rules to catch missing dependencies
  - Be careful with object and array dependencies (use stable references)

```typescript
// ✅ Good: Complete dependency array
const filtered = useMemo(() => {
  return items.filter(item => item.category === category && item.active);
}, [items, category]);  // All dependencies included

// ❌ Bad: Missing dependencies
const filtered = useMemo(() => {
  return items.filter(item => item.category === category && item.active);
}, [items]);  // Missing 'category' - stale closure!
```

### Code Splitting and Lazy Loading

- **Implement code splitting for large applications** - Split code into smaller chunks
  - Use `React.lazy()` for route-based code splitting
  - Load components on demand to reduce initial bundle size
  - Use `Suspense` for loading states

```typescript
// ✅ Good: Lazy loading with Suspense
const Settings = React.lazy(() => import('./components/Settings'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Settings />
    </Suspense>
  );
}

// ❌ Bad: All components loaded upfront
import Settings from './components/Settings';  // Loaded even if not used
```

### Performance Profiling

- **Profile before optimizing** - Identify actual bottlenecks before applying optimizations
  - Use React DevTools Profiler to identify slow components
  - Measure before and after optimizations
  - Don't optimize prematurely - focus on actual performance issues

### Avoid Premature Optimization

- **Only optimize when necessary** - Don't add memoization everywhere
  - Memoization adds overhead - use only when beneficial
  - Simple components don't need memoization
  - Profile first to identify real performance issues

### Examples

```typescript
// ✅ Good: Purposeful memoization
const ExpensiveList = React.memo(({ items, filter }: Props) => {
  const filtered = useMemo(() => {
    return items.filter(item => item.category === filter);
  }, [items, filter]);

  const handleClick = useCallback((id: number) => {
    onItemClick(id);
  }, [onItemClick]);

  return (
    <div>
      {filtered.map(item => (
        <Item key={item.id} item={item} onClick={handleClick} />
      ))}
    </div>
  );
});

// ❌ Bad: Over-memoization
const SimpleList = React.memo(({ items }: Props) => {
  const filtered = useMemo(() => items, [items]);  // Unnecessary
  const handleClick = useCallback(() => {}, []);  // Unnecessary

  return <div>{filtered.map(item => <div key={item.id}>{item.name}</div>)}</div>;
});
```

## React Security Best Practices

When working with React components, follow these essential security practices:

### XSS Prevention

- **Escape user inputs** - Never render user input without sanitization
  - React automatically escapes content in JSX
  - Never use `dangerouslySetInnerHTML` with user content
  - Sanitize user content before rendering if HTML is required

```typescript
// ✅ Good: React automatically escapes
const UserMessage = ({ message }: { message: string }) => {
  return <div>{message}</div>;  // Automatically escaped
};

// ❌ Bad: Using dangerouslySetInnerHTML with user content
const UserMessage = ({ message }: { message: string }) => {
  return <div dangerouslySetInnerHTML={{ __html: message }} />;  // XSS risk!
};
```

- **Sanitize user-generated content** - Use libraries like DOMPurify for HTML content
  - Only use `dangerouslySetInnerHTML` with sanitized content
  - Validate and sanitize all user inputs
  - Be especially careful with rich text editors

```typescript
// ✅ Good: Sanitizing before rendering
import DOMPurify from 'dompurify';

const RichTextContent = ({ html }: { html: string }) => {
  const sanitized = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
};

// ❌ Bad: No sanitization
const RichTextContent = ({ html }: { html: string }) => {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;  // XSS risk!
};
```

### Dependency Management

- **Keep dependencies updated** - Regularly update React and dependencies
  - Security patches are released regularly
  - Use automated dependency updates where possible
  - Audit dependencies for known vulnerabilities

### Input Validation

- **Validate all user inputs** - Don't trust client-side validation alone
  - Validate inputs in services before processing
  - Use type guards and validation schemas
  - Provide clear error messages for invalid inputs

```typescript
// ✅ Good: Validating inputs
const handleSubmit = async (input: string) => {
  if (!isValidInput(input)) {
    setError('Invalid input');
    return;
  }
  await service.processInput(input);
};

// ❌ Bad: No validation
const handleSubmit = async (input: string) => {
  await service.processInput(input);  // No validation!
};
```

## Application Architecture

For application-specific architecture details, including:
- Chat persistence architecture and database schema
- Dependency injection patterns and service wiring
- Service provider interfaces and implementation patterns

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete documentation.
