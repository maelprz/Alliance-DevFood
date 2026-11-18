import { createContext } from "react";

// Isolated file: only exports the context object, no components or hooks.
// This satisfies the React Compiler Fast Refresh rule.
export const OrderContext = createContext(null);
