import type { Database as GeneratedDatabase } from "./database.types";

// Postgres accepts NULL arguments; the generator cannot infer that contract.
// Keep these two nullable inputs explicit without modifying generated files.
type Functions = GeneratedDatabase["public"]["Functions"];
type NullableArg<F extends { Args: object }, K extends keyof F["Args"]> = Omit<F,"Args"> & {
  Args: Omit<F["Args"],K> & { [P in K]: F["Args"][P] | null };
};
export type Database = Omit<GeneratedDatabase,"public"> & {
  public: Omit<GeneratedDatabase["public"],"Functions"> & {
    Functions: Omit<Functions,"enroll_customer"|"save_activity"> & {
      enroll_customer: NullableArg<Functions["enroll_customer"],"p_customer_id">;
      save_activity: NullableArg<Functions["save_activity"],"p_id">;
    };
  };
};
