## Architectural Principles

When working with application architecture, follow these essential patterns and guidelines:

> **Note**: For general coding rules (TypeScript, React, Electron styling, testing, etc.), see [AGENTS.md](./AGENTS.md). This document focuses on application-specific architecture patterns.

### SOLID Principles

#### Dependency Inversion Principle (DIP)
- **High-level modules depend on abstractions, not concrete implementations**
- Services depend on interface abstractions, not concrete classes
- Always inject interfaces in constructors, not concrete classes
- Composition root can instantiate concrete classes, but passes them as interfaces

See [Dependency Injection and Wiring](#dependency-injection-and-wiring) and [Service Provider Interfaces](#service-provider-interfaces) for complete patterns.

#### Interface Segregation Principle (ISP)
- **Interfaces should be focused and not force clients to depend on methods they don't use**
- Group methods by concern (read, write, initialization, lifecycle)
- Use shared types to avoid exposing repository internals
- Keep interfaces cohesive - methods should be related to the same responsibility

### Data Persistence Patterns

#### Explicit Entity ID
- **Always pass explicit entity identifiers when performing operations**
- Never rely on implicit "current entity" state
- Entity ID should be obtained explicitly and tracked for subsequent operations
- Pass identifiers explicitly in all operation payloads

```typescript
// ✅ Good: Explicit entity ID
const payload = {
  entityId: this.currentEntityId!,
  data: entityData,
};

// ❌ Bad: Implicit entity ID
service.saveData(data);  // No entityId specified
```

#### Database Location Strategy
- Development: Use relative paths from process working directory
- Production: Use application data directory from platform APIs
- Follow consistent patterns across all repositories

#### Entity Persistence
- Entities are saved automatically when operations are performed
- Use idempotent operations to handle duplicates gracefully
- Entity timestamps are updated when data is saved
- Operations require explicit entity identifiers - no automatic entity creation

#### Entity Session Creation
- New entity sessions are created when needed
- Configuration is read from current settings when creating entities
- Default values are used when not provided
- Entity ID is returned and tracked for subsequent operations

### Interface Structure

#### Repository Interface
- Data access layer interface
- Methods for initialization, creation, saving, retrieval, listing, and lifecycle management
- Implemented by concrete repository (e.g., SQLite, file-based, etc.)

#### Service Interface
- Business logic layer interface
- Methods for initialization, entity management, data operations, and lifecycle
- Implemented by service (wraps repository with business logic)

#### Entity Info Type
- Shared type for entity information
- Used in return types to avoid exposing repository internals
- Contains essential entity metadata

### Event-Driven Communication

When using event-driven communication (e.g., IPC, messaging):

- Create entity sessions via dedicated events
- Save data with explicit entity identifiers via events
- Load data for specific entities via events
- List all entities via events

### Examples

```typescript
// ✅ Good: Repository implements interface with explicit entity ID
export class EntityRepository implements IEntityRepository {
  public saveData(entityId: number, data: IEntityData): void {
    // Implementation with explicit entityId
  }
}

// ❌ Bad: Concrete dependencies and implicit state
export class EntityService {
  private readonly repository: EntityRepository;  // Concrete dependency
  private currentEntityId: number | null = null;  // Implicit state

  public saveData(data: IEntityData): void {
    // Uses implicit currentEntityId - bad!
  }
}
```

See [Service Provider Interfaces](#service-provider-interfaces) for interface dependency patterns.

## Dependency Injection and Wiring

When creating services and managing dependencies, always follow these essential rules:

### No Default Parameters

- **Never use default parameters in service constructors**
- All dependencies must be explicitly provided
- Services should not create their own dependencies internally
- This makes the dependency graph explicit and testable

```typescript
// ✅ Good: Required parameter, no default
export class Service {
  private readonly repository: IRepository;

  public constructor(repository: IRepository) {
    this.repository = repository;
  }
}

// ❌ Bad: Default parameter hides dependency
export class Service {
  private readonly repository: IRepository;

  public constructor(repository: IRepository = new Repository()) {
    this.repository = repository;
  }
}
```

### Explicit Dependency Wiring

- **All dependencies must be wired explicitly at the composition root**
- The composition root is the only place where concrete classes are instantiated
- Create dependencies in dependency order (repositories first, then services)
- All service constructors require explicit dependencies (no defaults)

### Dependency Creation Order

When wiring dependencies in the composition root, follow this order:

1. **Repositories** (no dependencies) - Create first
   - Data access layer components with no dependencies

2. **Services** (depend on repositories or other services) - Create in dependency order
   - Services that depend on repositories
   - Services that depend on other services
   - Infrastructure services that depend on domain services

### Composition Root Pattern

The composition root constructor should:

1. Create all repositories first (they have no dependencies)
2. Create services in dependency order
3. Wire all dependencies explicitly
4. Never rely on default parameters
5. Store all services as interfaces

```typescript
// ✅ Good: Complete interface-based composition root with explicit wiring
export class CompositionRoot {
  private readonly serviceA: IServiceA;
  private readonly serviceB: IServiceB;
  private readonly serviceC: IServiceC;
  private readonly handler: IHandler;

  public constructor() {
    // Create repositories (no dependencies)
    const repositoryA = new RepositoryA();
    const repositoryB = new RepositoryB();

    // Create services in dependency order - all stored as interfaces
    this.serviceA = new ServiceA(repositoryA);
    this.serviceB = new ServiceB(this.serviceA);
    this.serviceC = new ServiceC(repositoryB);
    this.handler = new Handler(
      this.serviceA,
      this.serviceB,
      this.serviceC,
    );
  }
}

// ❌ Bad: Services with default parameters or concrete types
export class CompositionRoot {
  private readonly serviceA: ServiceA;  // Concrete type

  public constructor() {
    // Services create their own dependencies - hidden!
    this.serviceA = new ServiceA();  // Creates RepositoryA internally
  }
}
```

### Current Implementation: AppBootstrap

The application uses `AppBootstrap` as the composition root. Here's the current implementation pattern:

```typescript
// packages/main/src/infrastructure/bootstrap/AppBootstrap.ts
export class AppBootstrap {
  private readonly chatService: IChatService;
  private readonly ipcHandlers: IIpcHandlers;
  private readonly logger: ILogger;
  private readonly settingsService: ISettingsService;
  // ... other services stored as interfaces

  public constructor(logger: ILogger) {
    this.logger = logger;

    // 1. Create repositories first (no dependencies)
    const appPath = isDev
      ? path.resolve(process.cwd(), 'app-data')
      : path.join(app.getPath('appData'), app.getName());
    const settingsRepository = new SettingsRepository(this.logger, appPath);
    const dbConnection = new DatabaseConnection(this.logger, appPath);
    const chatRepository = new ChatRepository(this.logger, dbConnection);
    const openTabsRepository = new OpenTabsRepository(this.logger, dbConnection);

    // 2. Create services in dependency order - all stored as interfaces
    this.settingsService = new SettingsService(settingsRepository);
    this.windowService = new WindowService();
    this.textSelectionService = new TextSelectionService();

    // Services that depend on other services
    this.shortcutService = new ShortcutService(
      this.settingsService,
      this.textSelectionService,
      this.windowService,
      this.logger,
      globalShortcut,
    );

    // Model services
    const ollamaModelService = new OllamaModelService(this.settingsService, this.logger);
    const lmStudioModelService = new LMStudioModelService(this.settingsService, this.logger);
    const modelService = new ModelService(
      this.settingsService,
      ollamaModelService,
      lmStudioModelService,
    );

    // Chat service depends on repository, model service, and window service
    this.chatService = new ChatService(
      chatRepository,
      modelService,
      this.windowService,
      this.logger,
      openTabsRepository,
    );

    // Infrastructure handlers depend on domain services
    this.ipcHandlers = new IpcHandlers(
      this.settingsService,
      modelService,
      this.windowService,
      this.chatService,
      this.logger,
      openTabsRepository,
    );
  }
}
```

Key points from the current implementation:
- All repositories are created first (SettingsRepository, DatabaseConnection, ChatRepository, OpenTabsRepository)
- Services are created in dependency order (SettingsService → ModelService → ChatService)
- All services are stored as interfaces (IChatService, ISettingsService, etc.)
- Infrastructure components (IpcHandlers) are created last and depend on domain services
- Platform-specific values (appPath) are injected into repositories, not accessed directly

### Benefits

- **Explicit dependencies**: All dependencies are visible at the composition root
- **Better testability**: Easy to inject mocks for testing
- **No hidden dependencies**: No service creates its own dependencies internally
- **Clear dependency graph**: Dependencies are explicit in composition root
- **Follows Dependency Inversion Principle**: High-level modules don't depend on low-level module instantiation (see [SOLID Principles](#solid-principles))
- **Single Responsibility**: Services focus on their logic, not dependency creation

## Service Provider Interfaces

When creating service classes, always define and use interfaces for all service providers. This enforces the Dependency Inversion Principle (see [SOLID Principles](#solid-principles)) and improves testability.

### Interface-First Design

- **Always create interfaces for service classes**
- Interfaces define the public contract that consumers depend on
- Concrete classes implement interfaces, but consumers depend on interfaces
- This allows easy substitution with mocks or alternative implementations

### Creating Service Interfaces

- **Define interfaces in separate files** (e.g., `IServiceName.ts`)
- Use descriptive names with `I` prefix: `IServiceA`, `IServiceB`, etc.
- Include JSDoc comments explaining the purpose and following DIP
- Use arrow function syntax for methods in interfaces (matches implementation pattern)

```typescript
// ✅ Good: Interface with arrow function syntax and JSDoc
/**
 * Interface for service operations
 * Following Dependency Inversion Principle - high-level modules depend on this abstraction
 */
export interface IService {
  /**
   * Load data from storage
   */
  loadData: () => Promise<IData>;

  /**
   * Save data to storage
   */
  saveData: (data: IData) => Promise<void>;
}
```

### Implementing Interfaces

- **Concrete classes must implement their interfaces**
- Use arrow function syntax for methods to match interface signatures
- All public methods from the interface must be implemented
- Keep implementation details private

```typescript
// ✅ Good: Class implements interface with arrow functions
export class Service implements IService {
  private readonly repository: IRepository;

  public constructor(repository: IRepository) {
    this.repository = repository;
  }

  public loadData = async (): Promise<IData> => {
    return this.repository.loadData();
  };

  public saveData = async (data: IData): Promise<void> => {
    return this.repository.saveData(data);
  };
}
```

### Using Interfaces in Dependencies

- **All service dependencies should use interfaces, not concrete classes**
- High-level modules depend on interfaces
- Only the composition root instantiates concrete classes
- Pass concrete instances as interfaces to consumers

See the [Composition Root Pattern](#composition-root-pattern) section for complete examples of interface-based dependency injection.

### Exporting Interfaces

- **Export interfaces from domain index files**
- Use `export type` for interfaces to ensure they're only used as types
- Export both interfaces and concrete classes from the same domain

```typescript
// ✅ Good: Export interface and implementation
// src/domains/domain/index.ts
export { Repository } from './Repository';
export { Service } from './Service';
export type { IService } from './IService';
```

### Interface Method Signatures

- **Use arrow function syntax in interfaces** to match implementation pattern
- This ensures type compatibility between interface and implementation
- Makes it clear that methods are properties, not class methods

```typescript
// ✅ Good: Arrow function syntax in interface
export interface IService {
  fetchData: (id: string) => Promise<IData>;
  processData: (data: IData[]) => Promise<IResult>;
}

// ✅ Good: Matching implementation
export class Service implements IService {
  public fetchData = async (id: string): Promise<IData> => {
    // Implementation
  };

  public processData = async (data: IData[]): Promise<IResult> => {
    // Implementation
  };
}
```

### Benefits

- **Testability**: Easy to create mock implementations for testing
- **Flexibility**: Can swap implementations without changing consumers
- **Clear Contracts**: Interfaces document exactly what methods are available
- **Dependency Inversion**: High-level modules don't depend on low-level implementations (see [Dependency Inversion Principle](#dependency-inversion-principle-dip))
- **Type Safety**: TypeScript ensures implementations match interface contracts
- **Separation of Concerns**: Interface defines "what", implementation defines "how"

### Examples

```typescript
// ✅ Good: Consumer depends on interface
export class ConsumerService {
  private readonly service: IService;  // Interface dependency

  public constructor(service: IService) {
    this.service = service;
  }
}

// ❌ Bad: Concrete dependencies
export class ConsumerService {
  private readonly service: Service;  // Concrete dependency
}
```

### Complete Interface Coverage

- **All services must have interfaces** - Domain services, infrastructure services, and utility services
- **Composition root uses only interfaces** - The composition root stores all services as interfaces
- **Infrastructure services also need interfaces** - Even infrastructure layer services should have interfaces

See the [Composition Root Pattern](#composition-root-pattern) section for the complete implementation showing all services stored as interfaces.

### Infrastructure Layer Interfaces

- **Infrastructure services also need interfaces** - Services in the infrastructure layer should have interfaces
- **Follows same pattern** - Infrastructure interfaces follow the same rules as domain interfaces
- **Complete abstraction** - All layers depend on abstractions, not concrete implementations

```typescript
// ✅ Good: Infrastructure service with interface
export interface IHandler {
  register: () => void;
}

export class Handler implements IHandler {
  private readonly serviceA: IServiceA;
  private readonly serviceB: IServiceB;

  public constructor(
    serviceA: IServiceA,
    serviceB: IServiceB,
  ) {
    this.serviceA = serviceA;
    this.serviceB = serviceB;
  }

  public register = (): void => {
    // Register handlers
  };
}

// ❌ Bad: Infrastructure service without interface
export class Handler {
  private readonly serviceA: ServiceA;  // Concrete dependency
  // No interface - consumers depend on concrete class
}
```

### Service Interface Checklist

When creating a new service, ensure:

1. ✅ **Create interface file** - `IServiceName.ts` in appropriate package
2. ✅ **Use arrow function syntax** - Methods in interface use arrow function syntax
3. ✅ **Add JSDoc comments** - Document the interface purpose and methods
4. ✅ **Implement interface** - Class implements the interface
5. ✅ **Use arrow functions** - Implementation methods use arrow function syntax
6. ✅ **Export interface** - Export from domain/index.ts using `export type`
7. ✅ **Depend on interfaces** - All consumers depend on the interface, not concrete class
8. ✅ **Wire in composition root** - Composition root instantiates concrete but stores as interface

### Complete Service Interface Pattern

When creating a new service, follow this complete pattern:

1. **Interface definition** (`IServiceName.ts`) - Define interface with arrow function syntax and JSDoc
2. **Implementation** (`ServiceName.ts`) - Implement interface with arrow functions
3. **Export** (`index.ts`) - Export both implementation and interface type
4. **Consumer** - Depend on interface, not concrete class
5. **Composition root** - Wire concrete instance but store as interface

See the [Composition Root Pattern](#composition-root-pattern) section for complete wiring examples, and the [Implementing Interfaces](#implementing-interfaces) section above for implementation details.

## IPC Communication Architecture

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
      const message: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LIST_CHATS> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_LIST_CHATS,
        payload: {},
      };

      const response = await this.ipcAdapter.invoke(message.channel, message);

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

const response = await ipcAdapter.invoke(message.channel, message);

if (isErrorResponse(response)) {
  throw new Error(response.error);
}

// Or for success-based responses
if (isFailedResponse(response)) {
  throw new Error(response.error);
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

## Model Service Response Processing

When processing model service responses (LLM API responses), always use the success/failed response pattern with explicit `success` property checks.

### Response Type Pattern

- **All model service responses must use success/failed pattern** - Model service responses must have a `success` boolean property
  - Success responses: `{ response: string, success: true }`
  - Failed responses: `{ error: string, success: false }`
  - Union type: `type ModelResponse = { response: string, success: true } | { error: string, success: false }`
  - This pattern provides type safety and clear distinction between success and failure states

### Response Processing Rules

- **Always check `success` property first** - Use explicit `success === false` check before accessing response data
  - TypeScript will properly narrow the type after the check
  - Never check for `'error' in response` or `'response' in response` - use the `success` property
  - After checking `success === false`, TypeScript knows the response is a failed response
  - After the check passes, TypeScript knows the response is a success response with `response` property

### Type Narrowing

- **Use type narrowing with success property** - The `success` property enables proper type narrowing
  - Check `response.success === false` to narrow to failed response type
  - After the check, TypeScript automatically narrows to success response type
  - No need for optional chaining or undefined checks after type narrowing

### Examples

```typescript
// ✅ Good: Using success property for type narrowing
public async generateChatTitle(userMessage: string, assistantMessage: string): Promise<string | null> {
  try {
    const response = await this.modelService.sendMessages([
      {
        role: 'user',
        content: prompt,
      },
    ]);

    if (response.success === false) {
      this.logger.error('Failed to generate chat title: %s', response.error);
      return null;
    }

    // TypeScript knows response.response exists here
    let title = response.response.trim();
    // ... process title
    return title || null;
  } catch (error: unknown) {
    const errorText = error instanceof Error ? error.message : String(error);
    this.logger.error('Error generating chat title: %s', errorText);
    return null;
  }
}
```

### Response Type Definitions

Model service response types should follow this pattern:

```typescript
// ✅ Good: Success/failed response types
export type OllamaChatSuccessResponse = {
  response: string;
  success: true;
};

export type OllamaChatFailedResponse = {
  error: string;
  success: false;
};

export type OllamaChatResponse = OllamaChatSuccessResponse | OllamaChatFailedResponse;
```

### Client Implementation

Clients should return responses with explicit `success` property:

```typescript
// ✅ Good: Client returns success/failed response
public async chat(model: string, messages: Message[]): Promise<OllamaChatResponse> {
  try {
    const response = await ollama.chat({
      model,
      messages,
      stream: false,
    });

    return { response: response.message.content, success: true as const };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error
      ? error.message
      : String(error);
    this.logger.error('Failed to send Ollama messages: %s', errorMessage);

    return { error: errorMessage, success: false as const };
  }
}
```

### Benefits

- **Type Safety**: TypeScript properly narrows response types after `success` check
- **Clarity**: Explicit `success` property makes success/failure states obvious
- **Consistency**: All model service responses follow the same pattern
- **No Optional Chaining**: After type narrowing, no need for optional chaining or undefined checks
- **Compile-Time Safety**: TypeScript catches errors when accessing properties that don't exist on the narrowed type

## Service Layer Architecture

The application uses a service layer pattern where services handle all IPC communication and state management. Services are instantiated in the renderer process and communicate with the main process via IPC.

### Current Service Implementation Pattern

Services in the renderer follow this pattern (example from `ChatService` and `ChatListService`):

```typescript
// packages/renderer/src/domains/chat-list/ChatListService.ts
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
      const message: TIpcEvent<EIpcChannel.CHAT, EIpcEvent.CHAT_LIST_CHATS> = {
        channel: EIpcChannel.CHAT,
        event: EIpcEvent.CHAT_LIST_CHATS,
        payload: {},
      };

      const response = await this.ipcAdapter.invoke(message.channel, message);

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

### Service Responsibilities

- **IPC Communication**: All IPC calls go through services, never directly from components
- **State Management**: Services maintain internal state and notify components via callbacks
- **Error Handling**: Services handle errors and log them appropriately
- **Response Validation**: Services use type guards to validate IPC responses
- **Listener Management**: Services register and cleanup IPC listeners for real-time updates

### Component Integration

Components receive services as props and register callbacks:

```typescript
// Example from renderer components
const ChatListComponent: React.FC<ChatListComponentProps> = ({ chatListService }) => {
  const [chats, setChats] = useState<IChatInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
};
```

## Repository Layer Architecture

Repositories handle data persistence and are instantiated in the main process. They receive platform-specific values (like `appPath`) via constructor injection.

### Current Repository Implementation Pattern

Repositories follow this pattern (example from `ChatRepository` and `SettingsRepository`):

```typescript
// packages/main/src/domains/chat/ChatRepository.ts
export class ChatRepository implements IChatRepository {
  private readonly dbConnection: DatabaseConnection;
  private readonly logger: ILogger;

  public constructor(logger: ILogger, dbConnection: DatabaseConnection) {
    this.logger = logger;
    this.dbConnection = dbConnection;
  }

  public createChat(title: string, provider: string, model: string): number {
    // Create chat in database
  }

  public getChat(chatId: number): IChatInfo | null {
    // Retrieve chat from database
  }
}
```

### Database Connection Pattern

The application uses a shared `DatabaseConnection` instance:

```typescript
// packages/main/src/infrastructure/database/DatabaseConnection.ts
export class DatabaseConnection {
  private db: Database | null = null;

  public constructor(
    private readonly logger: ILogger,
    private readonly appPath: string
    ) {
    this.dbPath = path.join(this.appPath, 'chats.db');
  }


  public getDatabase(): Database {
    if (this.db === null) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }
}
```

### Repository Creation in Bootstrap

Repositories are created with platform-specific paths injected:

```typescript
// In AppBootstrap constructor
const appPath = isDev
  ? path.resolve(process.cwd(), 'app-data')
  : path.join(app.getPath('appData'), app.getName());

const settingsRepository = new SettingsRepository(this.logger, appPath);
const dbConnection = new DatabaseConnection(this.logger, appPath);
const chatRepository = new ChatRepository(this.logger, dbConnection);
```

Key points:
- Repositories receive `appPath` or `dbConnection` via constructor
- No direct Electron API access in repositories
- Database connection is shared across repositories that need it
- All repositories implement interfaces for dependency injection

For general Electron security practices and Node.js best practices, see [AGENTS.md](./AGENTS.md).
