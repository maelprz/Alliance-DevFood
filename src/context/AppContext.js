import { createContext } from "react";

// Exports only AppContext — React Compiler rule (one export type per file)
// Holds: user (customer), adminUser (admin), logout
export const AppContext = createContext(null);
