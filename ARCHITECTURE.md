## Architectural Principles

When working with application architecture, follow these essential patterns and guidelines:

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
