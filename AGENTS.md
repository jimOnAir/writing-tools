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

### Logger Dependency Injection
- **Always inject logger via constructor, never import as global** - All classes that need logging must receive `ILogger` via constructor injection
  - Never import `logger` from `@writing-tools/shared` directly in classes that use logging
  - Accept `logger: ILogger` as a constructor parameter
  - Store logger as `private readonly logger: ILogger`
  - Use `this.logger.error()`, `this.logger.info()`, etc. instead of `logger.error()`, `logger.info()`
  - Pass logger through the dependency chain: `AppBootstrap` → services/repositories → clients
  - In tests, provide mock logger instances that implement `ILogger` interface
  - Logger instance is created in `main.ts` and passed to `AppBootstrap` constructor

### Electron Dependency Avoidance
- **Never import Electron APIs directly in services or repositories** - Services and repositories must be platform-agnostic
  - Never import `app`, `BrowserWindow`, or other Electron APIs in service/repository classes
  - Never import `electron-is-dev` or other Electron-specific utilities in services/repositories
  - Pass platform-specific values (like `appPath`) through constructor parameters instead
  - Electron dependencies should only exist in infrastructure/bootstrap layer (e.g., `AppBootstrap`)
  - This improves testability, separation of concerns, and makes services reusable across different platforms
  - Services and repositories should receive all platform-specific values as constructor parameters

```typescript
// ✅ Good: Platform-agnostic repository with appPath injected
export class ChatRepository implements IChatRepository {
  private readonly dbPath: string;
  private readonly logger: ILogger;

  public constructor(logger: ILogger, appPath: string) {
    this.logger = logger;
    this.dbPath = path.join(appPath, 'chats.db');
  }
}

// AppBootstrap.ts - Electron dependency only in bootstrap layer
import { app } from 'electron';
import * as path from 'node:path';

export class AppBootstrap {
  public constructor(logger: ILogger) {
    const appPath = path.join(app.getPath('appData'), app.getName());
    const chatRepository = new ChatRepository(this.logger, appPath);
  }
}

// ❌ Bad: Electron dependency in repository
import { app } from 'electron';
import isDev from 'electron-is-dev';

export class ChatRepository implements IChatRepository {
  public constructor(logger: ILogger) {
    // Direct Electron dependency - WRONG!
    if (isDev) {
      this.dbPath = path.join(process.cwd(), 'app-data', 'chats.db');
    } else {
      this.dbPath = path.join(app.getPath('appData'), app.getName(), 'chats.db');
    }
  }
}
```

```typescript
// ✅ Good: Platform-agnostic settings repository with appPath injected
export class SettingsRepository implements ISettingsRepository {
  private readonly appPath: string;
  private readonly logger: ILogger;

  public constructor(logger: ILogger, appPath: string) {
    this.logger = logger;
    this.appPath = appPath;
  }

  private getSettingsFilePath(): string {
    return path.join(this.appPath, 'settings.json');
  }
}

// AppBootstrap.ts - Electron dependency only in bootstrap layer
import { app } from 'electron';
import * as path from 'node:path';

export class AppBootstrap {
  public constructor(logger: ILogger) {
    const appPath = path.join(app.getPath('appData'), app.getName());
    const settingsRepository = new SettingsRepository(this.logger, appPath);
  }
}

// ❌ Bad: Electron dependency in settings repository
import { app } from 'electron';
import isDev from 'electron-is-dev';

export class SettingsRepository implements ISettingsRepository {
  public constructor(logger: ILogger) {
    // Direct Electron dependency - WRONG!
    if (isDev) {
      this.appPath = path.join(process.cwd(), 'app-data');
    } else {
      this.appPath = path.join(app.getPath('appData'), app.getName());
    }
  }
}
```

```typescript
// ✅ Good: Service receives all dependencies via constructor
export class EntityService implements IEntityService {
  private readonly repository: IEntityRepository;
  private readonly logger: ILogger;

  public constructor(repository: IEntityRepository, logger: ILogger) {
    this.repository = repository;
    this.logger = logger;
  }
}

// ❌ Bad: Service imports Electron directly
import { app } from 'electron';

export class EntityService implements IEntityService {
  public constructor(repository: IEntityRepository) {
    // Direct Electron dependency - WRONG!
    const appPath = app.getPath('appData');
  }
}
```

```typescript
// ✅ Good: Logger injected via constructor
export class EntityService implements IEntityService {
  private readonly logger: ILogger;
  private readonly repository: IEntityRepository;

  public constructor(repository: IEntityRepository, logger: ILogger) {
    this.logger = logger;
    this.repository = repository;
  }

  public async processEntity(): Promise<string | null> {
    try {
      // ... logic
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Error processing entity: %s', errorText);
      return null;
    }
  }
}

// ❌ Bad: Global logger import
import { logger } from '@writing-tools/shared';

export class EntityService implements IEntityService {
  public constructor(repository: IEntityRepository) {
    // Missing logger injection
  }

  public async processEntity(): Promise<string | null> {
    try {
      // ... logic
    } catch (error: unknown) {
      logger.error('Error processing entity: %s', errorText); // Using global logger
      return null;
    }
  }
}
```

```typescript
// ✅ Good: Logger passed through dependency chain
// main.ts
import { Logger } from '@writing-tools/shared';
const logger = new Logger();
const bootstrap = new AppBootstrap(logger);

// AppBootstrap.ts
export class AppBootstrap {
  private readonly logger: ILogger;

  public constructor(logger: ILogger) {
    this.logger = logger;
    const entityRepository = new EntityRepository(this.logger);
    const entityService = new EntityService(entityRepository, this.logger);
  }
}

// ✅ Good: Test with mock logger
describe('EntityService', () => {
  let mockLogger: jest.Mocked<ILogger>;
  let entityService: EntityService;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      setEnvironment: jest.fn(),
      setLevel: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    entityService = new EntityService(mockRepository, mockLogger);
  });
});
```

### Logging Best Practices

When using the logger, follow these essential rules for effective and maintainable logging:

#### Log Levels

- **Use `error` for errors and exceptions** - Log all caught exceptions, failed operations, and error conditions
  - Always log errors in catch blocks
  - Include error context and relevant parameters
  - Use for operations that fail and cannot be recovered automatically

- **Use `warn` for warnings and recoverable issues** - Log situations that are unusual but don't prevent operation
  - Use for deprecated API usage, fallback behavior, or degraded functionality
  - Use for validation failures that have fallbacks
  - Use for configuration issues that don't prevent startup

- **Use `info` for important state changes and operations** - Log significant application events and state transitions
  - Use for service initialization, configuration loading, and startup events
  - Use for important user actions (chat creation, settings changes)
  - Use for successful completion of critical operations
  - Don't use for frequent operations (e.g., every message sent)

- **Use `debug` for detailed diagnostic information** - Log detailed execution flow for debugging
  - Use for method entry/exit in complex flows
  - Use for detailed state information during development
  - Use for tracing data transformations and intermediate values
  - Can be verbose - typically disabled in production

#### Error Logging

- **Always log errors in catch blocks** - Every catch block should log the error
  - Extract error message safely: `error instanceof Error ? error.message : String(error)`
  - Include context about what operation failed
  - Include relevant parameters that led to the error

```typescript
// ✅ Good: Comprehensive error logging
public async processData(data: string): Promise<void> {
  try {
    const response = await this.externalService.process(data);
    if (response.success === false) {
      this.logger.error('Failed to process data via external service: %s', response.error);
      return;
    }
    // ... handle success
  } catch (error: unknown) {
    const errorText = error instanceof Error ? error.message : String(error);
    this.logger.error('Error processing data: %s', errorText);
    throw error;
  }
}

// ❌ Bad: Missing error logging
public async processData(data: string): Promise<void> {
  try {
    await this.externalService.process(data);
  } catch (error: unknown) {
    // No logging - error is lost!
    throw error;
  }
}
```

#### Log Message Formatting

- **Use format strings with placeholders** - Use `%s`, `%d`, `%j` placeholders instead of string concatenation
  - Format strings are more efficient and support structured logging
  - Use `%s` for strings, `%d` for numbers, `%j` for JSON objects
  - Include relevant context in log messages

```typescript
// ✅ Good: Using format strings
this.logger.info('Chat created: id=%d, title=%s', chatId, title);
this.logger.error('Failed to load settings: %s', errorText);
this.logger.debug('Processing message: %j', { id: messageId, role: message.role });

// ❌ Bad: String concatenation
this.logger.info('Chat created: id=' + chatId + ', title=' + title);
this.logger.error('Failed to load settings: ' + errorText);
this.logger.debug('Processing message: ' + JSON.stringify({ id: messageId, role: message.role }));
```

#### Context and Information

- **Include relevant context in log messages** - Log messages should be self-contained and informative
  - Include identifiers (chatId, messageId, userId) when relevant
  - Include operation names and method context
  - Include relevant state information that helps diagnose issues

```typescript
// ✅ Good: Logging with context
public async deleteEntity(entityId: number): Promise<void> {
  this.logger.info('Deleting entity: id=%d', entityId);
  try {
    await this.repository.deleteEntity(entityId);
    this.logger.info('Entity deleted successfully: id=%d', entityId);
  } catch (error: unknown) {
    const errorText = error instanceof Error ? error.message : String(error);
    this.logger.error('Failed to delete entity: id=%d, error=%s', entityId, errorText);
    throw error;
  }
}

// ❌ Bad: Missing context
public async deleteEntity(entityId: number): Promise<void> {
  this.logger.info('Deleting entity');
  try {
    await this.repository.deleteEntity(entityId);
  } catch (error: unknown) {
    this.logger.error('Failed'); // No context about which entity or what error
    throw error;
  }
}
```

#### What to Log

- **Log important state changes** - Log when significant state changes occur
  - Service initialization and shutdown
  - Configuration loading and validation
  - Critical user actions (chat creation, deletion, settings changes)
  - External API calls and responses (at info level for success, error level for failures)

- **Log entry/exit of critical methods** - Use debug level for method tracing
  - Log method entry with parameters (debug level)
  - Log method exit with results (debug level)
  - Helps trace execution flow during debugging

```typescript
// ✅ Good: Logging method entry/exit at debug level
public async loadEntities(): Promise<IEntityInfo[]> {
  this.logger.debug('Loading entities');
  try {
    const entities = await this.repository.getAllEntities();
    this.logger.debug('Loaded %d entities', entities.length);
    return entities;
  } catch (error: unknown) {
    const errorText = error instanceof Error ? error.message : String(error);
    this.logger.error('Failed to load entities: %s', errorText);
    throw error;
  }
}
```

#### What NOT to Log

- **Never log sensitive information** - Never log passwords, API keys, tokens, or personal data
  - Sanitize user input before logging if it might contain sensitive data
  - Use placeholders for sensitive values: `this.logger.debug('API key: ***')`
  - Be careful with full request/response bodies that might contain sensitive data

- **Avoid excessive logging in hot paths** - Don't log in frequently called methods
  - Avoid logging every message sent/received (use debug level if needed)
  - Avoid logging in tight loops or high-frequency operations
  - Use debug level for detailed tracing that can be disabled in production

```typescript
// ✅ Good: Selective logging
public async processData(data: string): Promise<void> {
  // Don't log every operation - too frequent
  // Only log errors
  try {
    await this.processOperation(data);
  } catch (error: unknown) {
    const errorText = error instanceof Error ? error.message : String(error);
    this.logger.error('Error processing data: %s', errorText);
    throw error;
  }
}

// ❌ Bad: Excessive logging
public async processData(data: string): Promise<void> {
  this.logger.info('Processing data: %s', data); // Too verbose
  try {
    await this.processOperation(data);
    this.logger.info('Data processed successfully'); // Too verbose
  } catch (error: unknown) {
    // ...
  }
}
```

#### Service Initialization Logging

- **Log service initialization and lifecycle events** - Log when services start, stop, or encounter initialization errors
  - Log successful initialization at info level
  - Log initialization failures at error level
  - Include relevant configuration in initialization logs

```typescript
// ✅ Good: Service initialization logging
export class EntityService implements IEntityService {
  public constructor(
    private readonly repository: IEntityRepository,
    private readonly logger: ILogger
    ) {
    this.logger.info('EntityService initialized');
  }
}
```

#### Examples

```typescript
// ✅ Good: Comprehensive logging with appropriate levels
export class EntityService implements IEntityService {
  private readonly logger: ILogger;
  private readonly repository: IEntityRepository;

  public constructor(
    private readonly repository: IEntityRepository,
    private readonly logger: ILogger
    ) {
    this.logger.info('EntityService initialized');
  }

  public async createEntity(title: string, type: string, config: string): Promise<number> {
    this.logger.debug('Creating entity: title=%s, type=%s, config=%s', title, type, config);
    try {
      const entityId = this.repository.createEntity(title, type, config);
      this.logger.info('Entity created: id=%d, title=%s', entityId, title);
      return entityId;
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to create entity: title=%s, error=%s', title, errorText);
      throw error;
    }
  }

  public async processEntity(entityId: number, data: string): Promise<void> {
    this.logger.debug('Processing entity: entityId=%d', entityId);
    try {
      const response = await this.externalService.process(data);
      if (response.success === false) {
        this.logger.error('External service error: entityId=%d, error=%s', entityId, response.error);
        return;
      }
      // ... process response
    } catch (error: unknown) {
      const errorText = error instanceof Error ? error.message : String(error);
      this.logger.error('Error processing entity: entityId=%d, error=%s', entityId, errorText);
      throw error;
    }
  }
}
```

```typescript
// ❌ Bad: Poor logging practices
export class EntityService implements IEntityService {
  public constructor(repository: IEntityRepository, logger: ILogger) {
    // No initialization logging
  }

  public async createEntity(title: string, type: string, config: string): Promise<number> {
    // No debug logging
    try {
      const entityId = this.repository.createEntity(title, type, config);
      // No success logging
      return entityId;
    } catch (error: unknown) {
      // No error logging
      throw error;
    }
  }

  public async processEntity(entityId: number, data: string): Promise<void> {
    this.logger.info('Data: ' + data); // String concatenation, too verbose
    try {
      await this.processData(data);
    } catch {
      // No error logging
    }
  }
}
```

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

### Tooltip Usage
- **Always use the shared markdown `Tooltip` component for UI tooltips**
  - Import `Tooltip` from `packages/renderer/src/components/Tooltip.tsx`
  - Pass tooltip text as markdown-capable `content` (it will be rendered via `renderMarkdown`)
  - Wrap the interactive element as the `children` of `Tooltip`
  - Do not use native `title` attributes for interactive tooltips in the renderer

```typescript
// ✅ Good: Using markdown Tooltip for a copy button
import { Tooltip } from '../components/Tooltip';

<Tooltip content="Copy message">
  <button
    type="button"
    aria-label="Copy message to clipboard"
  >
    ⧉
  </button>
</Tooltip>

// ❌ Bad: Using native title attribute instead of Tooltip
<button
  type="button"
  aria-label="Copy message to clipboard"
  title="Copy message"
>
  ⧉
</button>
```

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

## Native Look and Feel Design

The application must provide a native look and feel that adapts to each operating system (macOS, Windows, Linux). This ensures the application feels integrated with the user's desktop environment and follows platform conventions.

### Platform Detection

- **Always use the platform detection utility** - Use `getPlatform()` from `utils/platformDetection.ts`
- **Cache platform value** - Platform is detected once and cached for performance
- **Fallback to Linux** - If detection fails or electronAPI is unavailable, default to Linux styling

```typescript
// ✅ Good: Using platform detection
import { getPlatform } from '../utils/platformDetection';

const [platform, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('linux');

useEffect(() => {
  void getPlatform().then(p => {
    setPlatform(p);
  });
}, []);
```

### Native Styles System

- **Always use `NativeStyles` for platform-specific styling** - Never hardcode platform-specific styles
- **Import from `styles/NativeStyles.tsx`** - Use `getNativeStyles(platform)` to get platform-specific styles
- **Apply styles based on detected platform** - Styles automatically adapt to the user's OS

```typescript
// ✅ Good: Using native styles
import { getNativeStyles } from '../styles/NativeStyles';
import { getPlatform } from '../utils/platformDetection';

const nativeStyles = getNativeStyles(platform);

<div className={nativeStyles.sidebar.background}>
  {/* Sidebar content */}
</div>

<button className={nativeStyles.button.primary}>
  Click me
</button>
```

### Platform-Specific Design Principles

#### macOS (darwin)
- **Translucent backgrounds** - Use `backdrop-blur-xl` and opacity for glass-like effects
- **Rounded corners** - Apply `rounded-lg`, `rounded-xl`, or `rounded-2xl` to elements
- **Soft shadows** - Use `shadow-md`, `shadow-lg`, or `shadow-2xl` for depth
- **Subtle borders** - Use low-opacity borders like `border-gray-700/30`
- **SF Pro font stack** - Use system fonts that match macOS typography

#### Windows (win32)
- **Solid backgrounds** - Use opaque backgrounds without blur effects
- **Flatter design** - Minimize shadows and depth effects
- **Sharp or subtle corners** - Use minimal rounding or sharp corners
- **Clear borders** - Use solid borders like `border-gray-800`
- **Segoe UI font** - Use Windows system font for native feel

#### Linux
- **GTK-inspired design** - Follow GNOME/KDE design patterns
- **Moderate transparency** - Use `backdrop-blur-sm` with high opacity backgrounds
- **Moderate border radius** - Use `rounded-lg` or `rounded-xl` for balance
- **System font stack** - Use the distribution's default system fonts

### Window Styling (Main Process)

- **Always use `getNativeWindowOptions()`** - WindowService provides platform-specific window options
- **Native frames** - Always use `frame: true` to show native window controls
- **Platform-specific title bars** - macOS uses `hiddenInset`, Windows/Linux use `default`
- **Vibrancy effects** - macOS windows use `vibrancy: 'under-window'` for translucency
- **Consistent window sizes** - All windows default to 1400×900 pixels

```typescript
// ✅ Good: WindowService automatically applies native styling
this.chatWindow = new BrowserWindow({
  ...this.getNativeWindowOptions(), // Platform-specific options applied
  height: 900,
  width: 1400,
  resizable: true,
  maximizable: true,
});
```

### Component Styling Patterns

- **Use native styles for UI components** - Tabs, sidebars, buttons, modals, inputs should use platform styles
- **Maintain platform-specific patterns** - Tab styling differs by platform (rounded on macOS, flat on Windows)
- **Font selection** - Use `nativeStyles.font.system` for typography that matches the OS

```typescript
// ✅ Good: Platform-aware component styling
export const TabBar: React.FC<TabBarProps> = ({ multiChatService }) => {
  const [platform, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('linux');

  useEffect(() => {
    void getPlatform().then(p => {
      setPlatform(p);
    });
  }, []);

  const nativeStyles = getNativeStyles(platform);

  return (
    <div className={nativeStyles.tabs.container}>
      {tabs.map((tab) => (
        <button
          className={`
            ${nativeStyles.tabs.tab.base}
            ${isActive ? nativeStyles.tabs.tab.active : nativeStyles.tabs.tab.inactive}
          `}
        >
          {tab.title}
        </button>
      ))}
    </div>
  );
};
```

### Examples

```typescript
// ✅ Good: Using native styles throughout component
import { getNativeStyles } from '../styles/NativeStyles';
import { getPlatform } from '../utils/platformDetection';

const Sidebar: React.FC<SidebarProps> = ({ chatListService }) => {
  const [platform, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('linux');
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    void getPlatform().then(p => {
      setPlatform(p);
    });
  }, []);

  const nativeStyles = getNativeStyles(platform);

  return (
    <div
      className={`
        ${nativeStyles.sidebar.background}
        ${nativeStyles.sidebar.border}
        ${isExpanded ? nativeStyles.sidebar.width.expanded : nativeStyles.sidebar.width.collapsed}
        transition-all duration-300
      `}
    >
      {/* Sidebar content */}
    </div>
  );
};
```

```typescript
// ✅ Good: Modal with platform-specific styling
const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [platform, setPlatform] = useState<'darwin' | 'win32' | 'linux'>('linux');

  useEffect(() => {
    void getPlatform().then(p => {
      setPlatform(p);
    });
  }, []);

  const nativeStyles = getNativeStyles(platform);

  if (!isOpen) return null;

  return (
    <div className={nativeStyles.modal.backdrop}>
      <div className={nativeStyles.modal.container}>
        {/* Modal content */}
      </div>
    </div>
  );
};
```

```typescript
// ❌ Bad: Hardcoded styles that don't adapt to platform
const Sidebar: React.FC = () => {
  return (
    <div className="bg-gray-800/60 backdrop-blur-xl border-r border-gray-700/30">
      {/* This only works on macOS - not native for Windows/Linux */}
    </div>
  );
};
```

### Window Behavior

- **All windows are resizable** - Users should be able to resize all windows
- **Consistent default size** - All windows default to 1400×900 pixels
- **Minimum size constraints** - Windows have minimum sizes (typically 600×400) to prevent unusable sizes
- **Native window controls** - Always show native minimize, maximize, and close buttons
- **Smooth window appearance** - Use `ready-to-show` event to prevent white flash on load

### Accessibility and Consistency

- **Consistent spacing** - Use platform-appropriate padding and margins
- **Readable fonts** - Ensure font sizes and weights are appropriate for each platform
- **Color contrast** - Maintain sufficient contrast for accessibility across all platforms
- **Touch targets** - Ensure interactive elements are appropriately sized for mouse/trackpad input

### Platform-Specific Features

- **macOS**: Translucent backgrounds, vibrancy effects, rounded elements, soft shadows
- **Windows**: Solid backgrounds, flat design, sharp corners, clear borders
- **Linux**: GTK-inspired design, moderate transparency, balanced border radius, system fonts

## Electron Native Styling Guidelines

When building Electron apps, follow these guidelines to make the app feel native and polished. These recommendations are based on best practices for making Electron apps feel native on macOS and other platforms.

### Desktop-Optimized Font Size

- **Use 14px base font size for desktop apps** - Desktop apps typically use smaller font sizes than web apps
  - Set `html { font-size: 14px; }` in your CSS to override the default 16px
  - This makes text feel more native and consistent with other desktop applications
  - Tailwind's rem-based sizing will automatically scale with this base size

```css
/* ✅ Good: Desktop-optimized font size */
html {
  font-size: 14px; /* Desktop app optimized (default is 16px for web) */
}

/* ❌ Bad: Using web default font size */
/* html { font-size: 16px; } */ /* Too large for desktop apps */
```

### System Font Stack

- **Always use system font stack** - Prioritize system fonts for native feel
  - Use `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont` as the first fonts in the stack
  - This ensures the app uses the platform's native system fonts (SF Pro on macOS, Segoe UI on Windows, etc.)
  - Fall back to common web fonts for compatibility

```css
/* ✅ Good: System font stack prioritized */
body {
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* ❌ Bad: Web fonts prioritized */
body {
  font-family: 'Roboto', 'Segoe UI', sans-serif; /* Doesn't use system fonts first */
}
```

### Cursor Styling

- **Use `cursor: default` for buttons and interactive elements** - Native apps use default cursor for buttons
  - Set `cursor: default` globally, then override only for actual links with `cursor: pointer`
  - Use `user-select: none` to prevent text selection on interactive elements
  - This matches native app behavior where buttons don't show pointer cursor

```css
/* ✅ Good: Default cursor for buttons, pointer only for links */
*, a, button {
  cursor: default;
  user-select: none;
}

a[href] {
  cursor: pointer; /* Only actual links get pointer cursor */
}

/* ❌ Bad: Pointer cursor for all buttons */
button {
  cursor: pointer; /* Not native - native apps use default cursor */
}
```

### Window Background Color

- **Match window background color to page background** - Prevents white flashes when resizing
  - Set `backgroundColor` in BrowserWindow options based on dark/light mode
  - Use `nativeTheme.shouldUseDarkColors` to detect system theme
  - Match the background color to your page's background (e.g., `#1f2937` for dark mode, `#ffffff` for light mode)

```typescript
// ✅ Good: Window background matches page background
import { BrowserWindow, nativeTheme } from 'electron';

const window = new BrowserWindow({
  backgroundColor: nativeTheme.shouldUseDarkColors ? '#1f2937' : '#ffffff',
  // ... other options
});

// ❌ Bad: Default white background causes flashes
const window = new BrowserWindow({
  // No backgroundColor set - defaults to white, causes flashes in dark mode
});
```

### Window Ready-to-Show Pattern

- **Use `ready-to-show` event to prevent white flash** - Show window only after content is loaded
  - Set `show: false` in BrowserWindow options
  - Listen for `ready-to-show` event before calling `window.show()`
  - This prevents the white flash that occurs when Electron windows are shown before content loads

```typescript
// ✅ Good: Wait for ready-to-show before showing window
const window = new BrowserWindow({
  show: false, // Don't show until ready
});

window.once('ready-to-show', () => {
  window.show();
});

// ❌ Bad: Showing window immediately causes white flash
const window = new BrowserWindow({
  show: true, // Shows before content loads - causes white flash
});
```

### Additional Recommendations

- **Draggable areas**: Use `-webkit-app-region: drag` for custom titlebars (not needed if using native frames)
- **Window focus/blur**: Handle focus events if you need unfocused UI variants (not needed if using native frames)
- **System integration**: Use platform-specific styling through NativeStyles system
- **Accessibility**: Maintain proper contrast and readable font sizes for all platforms

### References

These guidelines are based on best practices from the article "Making Electron apps feel native on Mac" (https://dev.to/vadimdemedes/making-electron-apps-feel-native-on-mac-52e8) and general Electron desktop app best practices.

## Electron Security Best Practices

When working with Electron applications, always follow these essential security practices:

### Context Isolation and Preload Scripts

- **Always enable context isolation** - Context isolation is enabled by default since Electron 12 and must remain enabled
  - Set `contextIsolation: true` in `webPreferences` for all BrowserWindow instances
  - This prevents renderer processes from accessing Node.js APIs directly
  - Prevents prototype pollution attacks

- **Use `contextBridge` for IPC communication** - Never expose `ipcRenderer` directly
  - Use `contextBridge.exposeInMainWorld()` to expose only specific, well-defined APIs
  - Expose only the functions needed, not the entire `ipcRenderer` module
  - Validate and sanitize all data passed through contextBridge

```typescript
// ✅ Good: Exposing specific, well-defined APIs
contextBridge.exposeInMainWorld('electronAPI', {
  invoke: async (channel: string, data: any) => {
    // Validate channel and data before invoking
    if (!isValidChannel(channel)) {
      throw new Error('Invalid channel');
    }
    return ipcRenderer.invoke(channel, data);
  },
});

// ❌ Bad: Exposing entire ipcRenderer
contextBridge.exposeInMainWorld('electronAPI', {
  send: ipcRenderer.send,  // Too permissive
  invoke: ipcRenderer.invoke,  // No validation
});
```

### Node.js Integration

- **Always disable Node.js integration in renderer** - Set `nodeIntegration: false` in `webPreferences`
  - Renderer processes should not have direct access to Node.js APIs
  - All Node.js access should go through the main process via IPC
  - This significantly reduces the attack surface

```typescript
// ✅ Good: Node integration disabled
webPreferences: {
  nodeIntegration: false,
  contextIsolation: true,
  preload: getPreloadPath(),
}

// ❌ Bad: Node integration enabled
webPreferences: {
  nodeIntegration: true,  // Security risk!
  contextIsolation: false,  // Security risk!
}
```

### Process Sandboxing

- **Enable process sandboxing** - Sandboxing is enabled by default since Electron 20
  - Sandboxing uses the OS to limit what renderer processes can access
  - Add an extra layer of security beyond context isolation
  - Verify sandboxing is enabled in production builds

### IPC Security

- **Validate and sanitize all IPC messages** - Never trust data from renderer processes
  - Validate channel names against a whitelist
  - Validate payload structure and types
  - Sanitize user inputs before processing
  - Use type guards and validation schemas

```typescript
// ✅ Good: Validating IPC messages
ipcMain.handle('save-data', async (_event, payload: unknown) => {
  // Validate payload structure
  if (!isValidPayload(payload)) {
    throw new Error('Invalid payload');
  }

  // Sanitize user input
  const sanitized = sanitizeInput(payload.data);

  return repository.save(sanitized);
});

// ❌ Bad: No validation
ipcMain.handle('save-data', async (_event, payload: any) => {
  return repository.save(payload.data);  // No validation!
});
```

### Content Security Policy (CSP)

- **Implement Content Security Policy** - Define CSP headers to restrict content sources
  - Mitigate XSS attacks by restricting script sources
  - Restrict resource loading to trusted sources only
  - Use `webSecurity: true` in webPreferences (default)

### Session Permissions

- **Handle session permission requests** - Don't auto-approve all permission requests
  - Implement custom handlers for notifications, camera, microphone, etc.
  - Only grant permissions to trusted content
  - Log permission requests for security auditing

```typescript
// ✅ Good: Custom permission handler
session.defaultSession.setPermissionRequestHandler(
  (webContents, permission, callback) => {
    // Only allow specific permissions from trusted sources
    if (permission === 'notifications' && isTrustedSource(webContents)) {
      callback(true);
    } else {
      callback(false);
    }
  }
);
```

### Preload Script Security

- **Keep preload scripts minimal** - Minimize code in preload scripts
  - Reduce attack surface by limiting exposed functionality
  - Only expose APIs that are absolutely necessary
  - Avoid complex logic in preload scripts

### Electron Updates

- **Keep Electron updated** - Regularly update Electron to latest stable version
  - Security patches are released regularly
  - New security features are added in updates
  - Use automated dependency updates where possible

### Examples

```typescript
// ✅ Good: Secure BrowserWindow configuration
const window = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,  // Disable Node.js in renderer
    contextIsolation: true,  // Enable context isolation
    preload: path.join(__dirname, 'preload.js'),  // Use preload script
    sandbox: true,  // Enable sandboxing (default in Electron 20+)
    webSecurity: true,  // Enable web security (default)
  },
});

// ❌ Bad: Insecure configuration
const window = new BrowserWindow({
  webPreferences: {
    nodeIntegration: true,  // Security risk!
    contextIsolation: false,  // Security risk!
    // No preload script - direct access to Node.js
  },
});
```

## Node.js Best Practices

When working with Node.js in the main process, follow these essential practices:

### Environment Variables

- **Use environment variables for sensitive data** - Never hardcode secrets
  - Store API keys, database credentials, and tokens in environment variables
  - Use `.env` files for development (never commit to git)
  - Use platform-specific secure storage for production
  - Validate environment variables at startup

```typescript
// ✅ Good: Using environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY environment variable is required');
}

// ❌ Bad: Hardcoded secrets
const apiKey = 'sk-1234567890abcdef';  // Never do this!
```

### Input Validation and Sanitization

- **Validate and sanitize all inputs** - Never trust user input
  - Validate input structure and types
  - Sanitize strings to prevent injection attacks
  - Use validation libraries (e.g., Zod, Joi) for complex validation
  - Validate IPC payloads, file paths, and user-provided data

```typescript
// ✅ Good: Validating and sanitizing input
import { z } from 'zod';

const UserInputSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

const validateInput = (input: unknown) => {
  return UserInputSchema.parse(input);
};

// ❌ Bad: No validation
const processInput = (input: any) => {
  return repository.save(input);  // No validation!
};
```

### Asynchronous Programming

- **Embrace asynchronous patterns** - Use async/await for all I/O operations
  - Never block the event loop with synchronous operations
  - Use Promise.all() for parallel operations when appropriate
  - Handle errors properly with try/catch
  - Use proper error propagation

```typescript
// ✅ Good: Proper async/await usage
public async loadData(): Promise<IData> {
  try {
    const data = await this.repository.load();
    return this.transform(data);
  } catch (error) {
    logger.error('Failed to load data:', error);
    throw error;
  }
}

// ❌ Bad: Blocking operations
public loadData(): IData {
  return this.repository.loadSync();  // Blocks event loop!
}
```

### Database Optimization

- **Optimize database interactions** - Use efficient queries and connection management
  - Use prepared statements to prevent SQL injection
  - Implement connection pooling for better performance
  - Use transactions for multiple related operations
  - Index frequently queried columns
  - Batch operations when possible

```typescript
// ✅ Good: Using prepared statements and transactions
public async saveMultiple(items: IItem[]): Promise<void> {
  const transaction = this.db.transaction(() => {
    const stmt = this.db.prepare('INSERT INTO items (name, value) VALUES (?, ?)');
    for (const item of items) {
      stmt.run(item.name, item.value);
    }
  });
  transaction();
}

// ❌ Bad: String concatenation in queries
public async saveItem(item: IItem): Promise<void> {
  this.db.run(`INSERT INTO items (name, value) VALUES ('${item.name}', ${item.value})`);  // SQL injection risk!
}
```

### Error Handling

- **Implement comprehensive error handling** - Handle errors at appropriate levels
  - Log errors with context for debugging
  - Use typed errors for better error handling
  - Don't expose internal error details to renderer
  - Return user-friendly error messages

```typescript
// ✅ Good: Proper error handling
public async processData(data: IData): Promise<IResult> {
  try {
    return await this.repository.save(data);
  } catch (error) {
    logger.error('Failed to process data:', { error, data });

    if (error instanceof ValidationError) {
      throw new Error('Invalid data provided');
    }

    throw new Error('Failed to process data');
  }
}
```

### Resource Management

- **Properly manage resources** - Clean up resources when done
  - Close database connections
  - Remove event listeners
  - Clear timers and intervals
  - Release file handles

```typescript
// ✅ Good: Resource cleanup
public cleanup(): void {
  this.db.close();
  this.removeAllListeners();
  if (this.timer) {
    clearInterval(this.timer);
  }
}
```

For application-specific IPC communication patterns, response handling, and model service response processing, see [ARCHITECTURE.md](./ARCHITECTURE.md).

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

## Component Design Principles

When designing React components, follow these essential principles to ensure components are reusable and maintainable:

### Generic Component Design

- **Make components generic and reusable** - Components should be domain-agnostic and reusable across different contexts
  - Remove domain-specific terminology from default values, labels, and text
  - Use generic terms that describe the component's purpose, not its specific use case
  - Avoid hardcoding domain-specific values in reusable components
  - This improves reusability and makes components easier to understand and maintain

```typescript
// ✅ Good: Generic tab component
export const Tab: React.FC<TabProps> = ({ tab, isActive, onSelect, onClose, platform }) => {
  const displayTitle = tab.title && tab.title.trim().length > 0 ? tab.title : 'New Tab';

  return (
    <button
      onClick={onSelect}
      aria-label={`Switch to tab: ${displayTitle}`}
    >
      {displayTitle}
    </button>
  );
};

// ❌ Bad: Domain-specific tab component
export const Tab: React.FC<TabProps> = ({ tab, isActive, onSelect, onClose, platform }) => {
  const displayTitle = tab.title && tab.title.trim().length > 0 ? tab.title : 'New Chat';

  return (
    <button
      onClick={onSelect}
      aria-label={`Switch to chat: ${displayTitle}`}
    >
      {displayTitle}
    </button>
  );
};
```

### Default Values and Labels

- **Use generic default values** - Default values should describe the component's state, not the domain
  - Use "New Tab" instead of "New Chat" for tab components
  - Use "Item" instead of "Chat" for list items
  - Use "Content" instead of "Message" for content areas
  - This allows the same component to be used in different contexts

```typescript
// ✅ Good: Generic default values
const displayTitle = tab.title && tab.title.trim().length > 0 ? tab.title : 'New Tab';
const ariaLabel = `Switch to tab: ${displayTitle}`;

// ❌ Bad: Domain-specific default values
const displayTitle = tab.title && tab.title.trim().length > 0 ? tab.title : 'New Chat';
const ariaLabel = `Switch to chat: ${displayTitle}`;
```

### Accessibility Labels

- **Use generic accessibility labels** - Accessibility labels should describe the component's action, not the domain
  - Use "Switch to tab:" instead of "Switch to chat:"
  - Use "Close tab" instead of "Close chat"
  - Use "Select item" instead of "Select chat"
  - This ensures accessibility labels remain accurate when components are reused

```typescript
// ✅ Good: Generic accessibility labels
<button aria-label={`Switch to tab: ${displayTitle}`}>
  {displayTitle}
</button>
<button aria-label="Close tab">×</button>

// ❌ Bad: Domain-specific accessibility labels
<button aria-label={`Switch to chat: ${displayTitle}`}>
  {displayTitle}
</button>
<button aria-label="Close chat">×</button>
```

### Component Naming

- **Use generic component names** - Component names should describe what they are, not what they contain
  - Use `Tab` instead of `ChatTab`
  - Use `ListItem` instead of `ChatListItem`
  - Use `Modal` instead of `ChatModal`
  - This makes it clear the component is reusable

### Examples

```typescript
// ✅ Good: Generic, reusable tab component
export interface TabProps {
  readonly tab: ITabInfo;
  readonly isActive: boolean;
  readonly onSelect: () => void;
  readonly onClose: () => void;
  readonly platform: 'darwin' | 'win32' | 'linux';
}

export const Tab: React.FC<TabProps> = ({ tab, isActive, onSelect, onClose, platform }) => {
  const nativeStyles = getNativeStyles(platform);
  const displayTitle = tab.title && tab.title.trim().length > 0 ? tab.title : 'New Tab';

  return (
    <div className={`${nativeStyles.tabs.tab.base} ${isActive ? nativeStyles.tabs.tab.active : nativeStyles.tabs.tab.inactive}`}>
      <button
        type="button"
        onClick={onSelect}
        aria-label={`Switch to tab: ${displayTitle}`}
      >
        <span className="truncate">{displayTitle}</span>
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close tab"
      >
        ×
      </button>
    </div>
  );
};
```

```typescript
// ❌ Bad: Domain-specific tab component
export interface ChatTabProps {
  readonly chat: IChatInfo;
  readonly isActive: boolean;
  readonly onSelect: () => void;
  readonly onClose: () => void;
}

export const ChatTab: React.FC<ChatTabProps> = ({ chat, isActive, onSelect, onClose }) => {
  const displayTitle = chat.title && chat.title.trim().length > 0 ? chat.title : 'New Chat';

  return (
    <div className={isActive ? 'active-chat-tab' : 'inactive-chat-tab'}>
      <button
        onClick={onSelect}
        aria-label={`Switch to chat: ${displayTitle}`}
      >
        {displayTitle}
      </button>
      <button
        onClick={onClose}
        aria-label="Close chat"
      >
        ×
      </button>
    </div>
  );
};
```

### Benefits

- **Reusability**: Generic components can be used in multiple contexts without modification
- **Maintainability**: Changes to generic components benefit all use cases
- **Clarity**: Generic names and labels make it clear the component is reusable
- **Flexibility**: Generic components can be adapted to different domains through props
- **Consistency**: Generic components promote consistent UI patterns across the application

## Testing Guidelines

When writing tests, always follow these essential rules and patterns:

### Test File Organization

- **Place test files in the same folder as the class/component being tested**
  - Component tests: `ComponentName.test.tsx` next to `ComponentName.tsx`
  - Service/class tests: `ClassName.test.ts` next to `ClassName.ts`
  - Utility tests: `utilityName.test.ts` next to `utilityName.ts`
  - Never use separate `__tests__` directories - keep tests co-located with source files

```typescript
// ✅ Good: Test file next to source file
packages/renderer/src/domains/chat/
  ChatService.ts
  ChatService.test.ts

// ❌ Bad: Test file in separate directory
packages/renderer/src/domains/chat/
  ChatService.ts
packages/renderer/src/domains/chat/__tests__/
  ChatService.test.ts
```

### Component Testing

- **Use React Testing Library for component tests**
  - Test user interactions (clicks, input changes, form submissions)
  - Test conditional rendering (loading states, error states, empty states)
  - Test accessibility attributes (aria-labels, htmlFor, etc.)
  - Test callback invocations
  - Mock all service dependencies passed as props

```typescript
// ✅ Good: Component test with mocked service
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import ChatComponent from './ChatComponent';

const createMockChatService = (): ChatService => {
  return {
    setCallbacks: jest.fn(),
    sendMessage: jest.fn().mockResolvedValue(null),
    getMessages: jest.fn().mockReturnValue([]),
    getIsLoading: jest.fn().mockReturnValue(false),
    getError: jest.fn().mockReturnValue(null),
  } as unknown as ChatService;
};

describe('ChatComponent', () => {
  it('allows sending a message', async () => {
    const mockService = createMockChatService();
    render(<ChatComponent chatService={mockService} chatId={null} />);

    const textarea = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByText('Send');

    fireEvent.change(textarea, { target: { value: 'Hello!' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockService.sendMessage).toHaveBeenCalledWith('Hello!');
    });
  });
});
```

### React act() Warnings

- **Always wrap state updates in `act()`** - When manually calling service callbacks that update React state, wrap them in `act()`
  - Use `act()` from `@testing-library/react` to wrap state updates
  - `waitFor()` automatically handles `act()` for async operations
  - When manually invoking callbacks (e.g., `onMessagesChange`, `onLoadingChange`), wrap them in `act()`
  - This ensures React state updates are properly batched and prevents warnings

```typescript
// ✅ Good: Using act() to wrap state updates
import { render, screen, act } from '@testing-library/react';

test('displays messages from service', () => {
  const mockMessages = [
    {
      id: '1',
      role: 'user' as const,
      content: 'Hello',
      timestamp: new Date(),
    },
  ];

  let onMessagesChange: ((messages: typeof mockMessages) => void) | undefined;

  mockChatService.setCallbacks.mockImplementation((callbacks) => {
    onMessagesChange = callbacks.onMessagesChange;
  });

  render(<ChatComponent chatService={mockChatService} chatId={null} />);

  if (onMessagesChange) {
    act(() => {
      onMessagesChange(mockMessages);
    });
  }

  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

```typescript
// ✅ Good: Using waitFor for async operations (automatically handles act())
import { render, screen, waitFor } from '@testing-library/react';

test('loads messages when chatId is provided', async () => {
  render(<ChatComponent chatService={mockChatService} chatId={1} />);

  await waitFor(() => {
    expect(mockChatService.loadChatMessages).toHaveBeenCalledWith(1);
  });
  // waitFor automatically wraps async state updates in act()
});
```

```typescript
// ❌ Bad: State update not wrapped in act()
test('displays messages from service', () => {
  let onMessagesChange: ((messages: typeof mockMessages) => void) | undefined;

  mockChatService.setCallbacks.mockImplementation((callbacks) => {
    onMessagesChange = callbacks.onMessagesChange;
  });

  render(<ChatComponent chatService={mockChatService} chatId={null} />);

  if (onMessagesChange) {
    onMessagesChange(mockMessages); // Warning: Not wrapped in act()
  }

  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

```typescript
// ❌ Bad: State update in async callback not wrapped in act()
test('displays error message', () => {
  let onErrorChange: ((error: string | null) => void) | undefined;

  mockChatService.setCallbacks.mockImplementation((callbacks) => {
    onErrorChange = callbacks.onErrorChange;
  });

  render(<ChatComponent chatService={mockChatService} chatId={null} />);

  if (onErrorChange) {
    onErrorChange('Test error'); // Warning: Not wrapped in act()
  }

  expect(screen.getByText('Test error')).toBeInTheDocument();
});
```

- **When to use `act()`**
  - Use `act()` when manually calling service callbacks that update React state
  - Use `act()` when triggering state updates synchronously in tests
  - Use `waitFor()` for async operations - it automatically handles `act()`
  - Use `act()` when testing useEffect hooks that trigger state updates

- **Common scenarios requiring `act()`**
  - Manually invoking `onMessagesChange`, `onLoadingChange`, `onErrorChange` callbacks
  - Testing components that update state in response to service callbacks
  - Testing components with useEffect hooks that trigger state updates
  - Testing components that update state based on async service responses

### Component Props Interface Export

- **Always export component props interfaces** - Export props interfaces from component files so they can be used in tests
  - Export the props interface with the `export` keyword
  - Use the exported interface type in test files for `defaultProps` and mock props
  - This ensures type safety in tests and keeps props interface in sync between component and tests
  - Provides better IDE autocomplete and type checking in test files

```typescript
// ✅ Good: Exported props interface used in test
// ComponentName.tsx
export interface ComponentNameProps {
  readonly prop1: string;
  readonly prop2: number;
  readonly onAction: () => void;
}

export const ComponentName: React.FC<ComponentNameProps> = ({ prop1, prop2, onAction }) => {
  // Component implementation
};

// ComponentName.test.tsx
import { ComponentName, ComponentNameProps } from './ComponentName';

describe('ComponentName', () => {
  const defaultProps: ComponentNameProps = {
    prop1: 'test',
    prop2: 42,
    onAction: jest.fn(),
  };

  it('renders correctly', () => {
    render(<ComponentName {...defaultProps} />);
    // Test implementation
  });
});
```

```typescript
// ❌ Bad: Props interface not exported, test uses inline type
// ComponentName.tsx
interface ComponentNameProps {
  readonly prop1: string;
  readonly prop2: number;
}

export const ComponentName: React.FC<ComponentNameProps> = ({ prop1, prop2 }) => {
  // Component implementation
};

// ComponentName.test.tsx
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  const defaultProps = { // No type safety, props might be out of sync
    prop1: 'test',
    prop2: 42,
  };

  it('renders correctly', () => {
    render(<ComponentName {...defaultProps} />);
  });
});
```

### Service Testing

- **Mock IPC adapter dependencies**
  - Test all public methods
  - Test callback registration and invocation
  - Test error handling
  - Test state management
  - Test listener lifecycle (init/cleanup)

```typescript
// ✅ Good: Service test with mocked IPC adapter
import { ElectronIpcAdapter } from '../../infrastructure/ipc/IpcAdapter';
import { ChatService } from './ChatService';

describe('ChatService', () => {
  let mockIpcAdapter: jest.Mocked<ElectronIpcAdapter>;
  let chatService: ChatService;

  beforeEach(() => {
    mockIpcAdapter = {
      invoke: jest.fn(),
      onChatWindowData: jest.fn(() => jest.fn()),
      offChatWindowData: jest.fn(),
      // ... other methods
    } as unknown as jest.Mocked<ElectronIpcAdapter>;

    chatService = new ChatService(mockIpcAdapter);
  });

  it('sends message and updates state', async () => {
    const mockResponse = { response: 'Test response' };
    mockIpcAdapter.invoke.mockResolvedValue(mockResponse);

    const onMessagesChange = jest.fn();
    chatService.setCallbacks({ onMessagesChange });

    await chatService.sendMessage('Hello');

    expect(mockIpcAdapter.invoke).toHaveBeenCalled();
    expect(onMessagesChange).toHaveBeenCalled();
  });
});
```

### HTTP Mocking for LLM APIs

- **Use `nock` for mocking LM Studio API calls**
  - Intercept `fetch` API calls to LM Studio endpoints
  - Mock both success and error responses
  - Test API key handling in headers
  - Clean up mocks after each test

```typescript
// ✅ Good: LM Studio client test with nock
import nock from 'nock';
import { LMStudioClient } from './LMStudioClient';

describe('LMStudioClient', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  it('sends chat message successfully', async () => {
    const mockResponse = {
      choices: [{ message: { content: 'Test response' } }],
    };

    nock('http://localhost:1234')
      .post('/v1/chat/completions')
      .reply(200, mockResponse);

    const client = new LMStudioClient({
      host: 'http://localhost:1234',
      apiKey: 'test-key',
    });

    const result = await client.chat('model', [
      { role: 'user', content: 'Hello' },
    ]);

    expect(result.response).toBe('Test response');
  });

  it('handles API errors', async () => {
    nock('http://localhost:1234')
      .post('/v1/chat/completions')
      .reply(500, { error: 'Internal server error' });

    const client = new LMStudioClient({
      host: 'http://localhost:1234',
    });

    const result = await client.chat('model', [
      { role: 'user', content: 'Hello' },
    ]);

    expect(result.error).toBeDefined();
  });
});
```

- **Use Jest mocks for Ollama package**
  - Mock the `ollama` npm package's `Ollama` class
  - Mock `chat()` and `list()` methods
  - Test error handling and connection failures

```typescript
// ✅ Good: Ollama client test with Jest mocks
import { OllamaClient } from './OllamaClient';

jest.mock('ollama', () => ({
  Ollama: jest.fn().mockImplementation(() => ({
    chat: jest.fn(),
    list: jest.fn(),
  })),
}));

import { Ollama } from 'ollama';

describe('OllamaClient', () => {
  it('sends chat message successfully', async () => {
    const mockOllama = {
      chat: jest.fn().mockResolvedValue({
        message: { content: 'Test response' },
      }),
    };

    (Ollama as jest.Mock).mockImplementation(() => mockOllama);

    const client = new OllamaClient({
      host: 'http://localhost:11434',
    });

    const result = await client.chat('model', [
      { role: 'user', content: 'Hello' },
    ]);

    expect(result.response).toBe('Test response');
    expect(mockOllama.chat).toHaveBeenCalledWith({
      model: 'model',
      messages: [{ role: 'user', content: 'Hello' }],
      stream: false,
    });
  });
});
```

### Repository Testing

- **Use in-memory database or test database files**
  - Test all CRUD operations
  - Test error handling
  - Mock file system operations when needed
  - Clean up test data after each test

```typescript
// ✅ Good: Repository test with test database
import { ChatRepository } from './ChatRepository';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('ChatRepository', () => {
  let repository: ChatRepository;
  let testDbPath: string;

  beforeEach(async () => {
    testDbPath = path.join(__dirname, 'test-chat.db');
    repository = new ChatRepository();
  });

  afterEach(async () => {
    await repository.close();
    try {
      await fs.unlink(testDbPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  it('creates and retrieves chat', () => {
    const chatId = repository.createChat('Test Chat', 'ollama', 'model');
    const chat = repository.getChat(chatId);

    expect(chat).not.toBeNull();
    expect(chat?.title).toBe('Test Chat');
  });
});
```

### Utility Testing

- **Test all exported functions**
  - Test edge cases (null, undefined, empty strings)
  - Test type guards with various inputs
  - Test normalization functions
  - Test error handling

```typescript
// ✅ Good: Utility test with edge cases
import { isErrorResponse, isFailedResponse } from './responseTypeGuards';

describe('responseTypeGuards', () => {
  describe('isErrorResponse', () => {
    it('returns true for error response', () => {
      expect(isErrorResponse({ error: 'Test error' })).toBe(true);
    });

    it('returns false for non-error response', () => {
      expect(isErrorResponse({ data: 'test' })).toBe(false);
    });

    it('returns false for null', () => {
      expect(isErrorResponse(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isErrorResponse(undefined)).toBe(false);
    });
  });
});
```

### Mocking Strategy

- **Mock `window.electronAPI` for renderer tests**
  - Create a mock object with all required methods
  - Mock `invoke` to return appropriate responses based on event type
  - Mock all listener registration methods

```typescript
// ✅ Good: Mock electronAPI for renderer tests
const mockElectronAPI = {
  invoke: jest.fn((channel, data) => {
    if (data.event === EIpcEvent.CHAT_LIST_CHATS) {
      return Promise.resolve({ chats: [] });
    }
    if (data.event === EIpcEvent.ENV_GET) {
      return Promise.resolve({ platform: 'linux' });
    }
    return Promise.resolve({ success: true });
  }),
  onChatWindowData: jest.fn(() => jest.fn()),
  offChatWindowData: jest.fn(),
  // ... other methods
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});
```

- **Mock file system operations for repository tests**
  - Use Jest mocks for `fs/promises` when needed
  - Test directory creation and file operations
  - Test error scenarios

### Type Safety in Test Mocks

- **Use `Pick` instead of `Partial` for mock objects** - When creating mock objects for tests, use `Pick<T, K>` to select only the properties you need
  - `Pick` provides better type safety by requiring specific properties to be present
  - `Partial` makes all properties optional, which can hide missing required properties
  - Use `Pick` to explicitly specify which properties are needed for the test
  - This ensures tests fail at compile time if required properties are missing

```typescript
// ✅ Good: Using Pick to select specific properties
const mockSettings: Pick<ISettings, 'lmstudio'> = {
  lmstudio: {
    address: 'http://localhost:1234',
    model: 'test-model',
    apiKey: '',
  },
};

mockSettingsService.loadSettings.mockResolvedValue(mockSettings as ISettings);

// ❌ Bad: Using Partial makes all properties optional
const mockSettings: Partial<ISettings> = {
  lmstudio: {
    address: 'http://localhost:1234',
    model: 'test-model',
    apiKey: '',
  },
};
// TypeScript won't catch if other required properties are missing
```

### Test Coverage Goals

- **Maintain comprehensive test coverage**
  - **Statements**: >80%
  - **Branches**: >75%
  - **Functions**: >80%
  - **Lines**: >80%

### Test Structure

Each test file should include:
- Happy path scenarios
- Error handling scenarios
- Edge cases (null, undefined, empty strings, invalid inputs)
- Boundary conditions
- Integration scenarios where appropriate

### Conditional Expects

- **Never use conditional expects** - All expects must be executed unconditionally
  - Never wrap expects in `if` statements or conditional blocks
  - Use `toEqual` or `toMatchObject` to match expected object structures
  - This ensures all test assertions are executed and failures are properly reported

```typescript
// ✅ Good: Using toEqual for exact object matching
const result = await client.chat('model', [{ role: 'user', content: 'Hello' }]);

expect(result).toEqual({
  response: 'Test response',
  success: true,
});
```

```typescript
// ❌ Bad: Conditional expects
const result = await client.chat('model', [{ role: 'user', content: 'Hello' }]);

expect(result.success).toBe(true);
if (result.success) {
  expect(result.response).toBe('Test response'); // May not execute if type narrowing fails
}
```

### Object Matching in Tests

- **Use `toEqual` or `toMatchObject` instead of type casting** - Match expected object structures directly
  - Use `toEqual` for exact object matching when you know all properties
  - Use `toMatchObject` for partial matching when you only need to verify specific properties
  - Use exact error messages when the error is predictable and controlled (e.g., from mocked errors)
  - Use `expect.stringContaining()` for partial string matching when error messages contain dynamic content (e.g., HTTP status codes, timestamps)
  - Use `expect.stringMatching(/./)` only when you truly need to verify a property is a non-empty string but the exact value is unpredictable (prefer exact matching when possible)
  - Never use `expect.any(String)` - it's too generic and doesn't verify the string is non-empty
  - Never use type assertions (`as`) to access properties - match the object structure instead
  - This provides better test coverage and clearer failure messages

```typescript
// ✅ Good: Using toEqual for exact matching
const result = await client.chat('model', [{ role: 'user', content: 'Hello' }]);

expect(result).toEqual({
  response: 'Test response from LM Studio',
  success: true,
});
```

```typescript
// ✅ Good: Using toMatchObject for partial matching with string contains
const result = await client.chat('model', [{ role: 'user', content: 'Hello' }]);

expect(result).toMatchObject({
  error: expect.stringContaining('HTTP 500'),
  success: false,
});
```

```typescript
// ✅ Good: Using exact error message when error is predictable
nock(baseUrl)
  .post('/v1/chat/completions')
  .replyWithError('Network error');

const result = await client.chat('model', [{ role: 'user', content: 'Hello' }]);

expect(result).toEqual({
  error: 'Network error',
  success: false,
});
```

```typescript
// ✅ Good: Using stringContaining for dynamic error messages
const result = await client.chat('model', [{ role: 'user', content: 'Hello' }]);

expect(result).toMatchObject({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  error: expect.stringContaining('HTTP 500'), // Error contains dynamic status code
  success: false,
});
```

```typescript
// ❌ Bad: Using stringMatching when exact error is known
nock(baseUrl)
  .post('/v1/chat/completions')
  .replyWithError('Network error');

const result = await client.chat('model', [{ role: 'user', content: 'Hello' }]);

expect(result).toMatchObject({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  error: expect.stringMatching(/./), // Should use exact error: 'Network error'
  success: false,
});
```

```typescript
// ❌ Bad: Using expect.any(String)
const result = await client.chat('model', [{ role: 'user', content: 'Hello' }]);

expect(result).toMatchObject({
  error: expect.any(String), // Too generic, doesn't verify string is non-empty
  success: false,
});
```

```typescript
// ❌ Bad: Type casting to access properties
const result = await client.chat('model', [{ role: 'user', content: 'Hello' }]);

expect(result.success).toBe(true);
expect((result as { response: string, success: true }).response).toBe('Test response');
```

```typescript
// ❌ Bad: Type casting with conditional access
const result = await client.chat('model', [{ role: 'user', content: 'Hello' }]);

if (result.success) {
  expect((result as { response: string, success: true }).response).toBe('Test response');
}
```

```typescript
// ✅ Good: Using toMatchObject for union types without success property
const result = await client.listModels();

expect(result).toMatchObject({
  error: expect.stringContaining('HTTP 404'),
});
```

```typescript
// ❌ Bad: Type casting for union types
const result = await client.listModels();

expect('error' in result).toBe(true);
expect((result as { error: string }).error).toContain('HTTP 404');
```

### Examples

```typescript
// ✅ Good: Comprehensive test with multiple scenarios
describe('SettingsService', () => {
  let mockIpcAdapter: jest.Mocked<ElectronIpcAdapter>;
  let settingsService: SettingsService;

  beforeEach(() => {
    mockIpcAdapter = createMockIpcAdapter();
    settingsService = new SettingsService(mockIpcAdapter);
  });

  describe('loadSettings', () => {
    it('loads settings successfully', async () => {
      const mockSettings = { provider: 'ollama', /* ... */ };
      mockIpcAdapter.invoke.mockResolvedValue(mockSettings);

      const onSettingsChange = jest.fn();
      settingsService.setCallbacks({ onSettingsChange });

      await settingsService.loadSettings();

      expect(onSettingsChange).toHaveBeenCalledWith(mockSettings);
    });

    it('handles load errors', async () => {
      mockIpcAdapter.invoke.mockRejectedValue(new Error('Load failed'));

      const onErrorChange = jest.fn();
      settingsService.setCallbacks({ onErrorChange });

      await settingsService.loadSettings();

      expect(onErrorChange).toHaveBeenCalledWith(expect.stringContaining('Load failed'));
    });
  });
});
```

```typescript
// ✅ Good: Component test with user interactions
describe('Settings', () => {
  it('updates provider when selected', async () => {
    const mockService = createMockSettingsService();
    render(<Settings settingsService={mockService} />);

    const providerSelect = screen.getByLabelText('Provider');
    fireEvent.change(providerSelect, { target: { value: 'lmstudio' } });

    await waitFor(() => {
      expect(mockService.updateProvider).toHaveBeenCalledWith('lmstudio');
    });
  });

  it('shows error message when save fails', async () => {
    const mockService = createMockSettingsService();
    (mockService.saveSettings as jest.Mock).mockResolvedValue('Save failed');

    render(<Settings settingsService={mockService} />);

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/Save failed/i)).toBeInTheDocument();
    });
  });
});
```

### E2E Testing for Bug Fixes

- **Always add e2e tests for found bugs** - When fixing bugs discovered during development or debugging, create e2e tests to prevent regression
  - Create e2e tests in the `e2e/` directory using Playwright
  - Test the full user flow that reproduces the bug
  - Verify that the fix prevents the bug from occurring
  - Name test files descriptively: `bug-description.spec.ts` (e.g., `prompt-select-duplicate-request.spec.ts`)
  - Include comments explaining the bug and the fix in the test file
  - This ensures bugs don't regress and provides documentation of the issue

```typescript
// ✅ Good: E2E test for bug fix
/**
 * E2E test for duplicate LLM request bug fix
 *
 * Bug: When switching from preconfigured prompts to chat tab,
 * the LLM request was being sent twice.
 *
 * Fix: MultiChatService no longer calls sendMessage when receiving CHAT_WINDOW_DATA
 * from prompt select. Instead, it loads messages and lets the OLLAMA_RESPONSE
 * listener handle the response.
 */
test.describe('Prompt Select - Duplicate Request Prevention', () => {
  test('should not send duplicate LLM request when switching from preconfigured prompt to chat', async ({ page }) => {
    // Test implementation that verifies only one request is sent
  });
});
```

```typescript
// ❌ Bad: No e2e test for bug fix
// Bug was fixed but no e2e test was added to prevent regression
```

## Application Architecture

For application-specific architecture details, including:
- Chat persistence architecture and database schema
- Dependency injection patterns and service wiring
- Service provider interfaces and implementation patterns

See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete documentation.
