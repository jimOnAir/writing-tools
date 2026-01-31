export type TOpenTab = {
  readonly chatId: number | null;
  readonly isActive: boolean;
  readonly scrollPosition?: number;
  readonly tabOrder: number;
};
