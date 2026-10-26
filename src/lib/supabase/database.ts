import type { Database as GeneratedDatabase } from "./database.types";

// Postgres accepts NULL arguments; the generator cannot infer that contract.
// Keep nullable inputs explicit without modifying generated files.
type Functions = GeneratedDatabase["public"]["Functions"];
type NullableArg<F extends { Args: object }, K extends keyof F["Args"]> = Omit<
  F,
  "Args"
> & {
  Args: Omit<F["Args"], K> & { [P in K]: F["Args"][P] | null };
};
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Functions"> & {
    Functions: Omit<
      Functions,
      | "save_communication_template"
      | "save_communication_owner"
      | "prepare_communication_automations"
      | "enroll_customer"
      | "save_activity"
      | "save_expense"
      | "save_expense_template"
      | "pay_expense"
      | "record_session"
      | "save_recovery_campaign"
    > & {
      save_communication_template: NullableArg<
        Functions["save_communication_template"],
        "p_id"
      >;
      save_communication_owner: NullableArg<
        Functions["save_communication_owner"],
        "p_id"
      >;
      prepare_communication_automations: NullableArg<
        Functions["prepare_communication_automations"],
        "p_day"
      >;
      enroll_customer: NullableArg<
        Functions["enroll_customer"],
        "p_customer_id"
      >;
      save_expense: NullableArg<Functions["save_expense"], "p_id">;
      save_expense_template: NullableArg<
        Functions["save_expense_template"],
        "p_id"
      >;
      pay_expense: NullableArg<Functions["pay_expense"], "p_reverse">;
      record_session: NullableArg<Functions["record_session"], "p_reverse">;
      save_recovery_campaign: NullableArg<
        Functions["save_recovery_campaign"],
        "p_activity"
      >;
      save_activity: NullableArg<Functions["save_activity"], "p_id">;
    };
  };
};
