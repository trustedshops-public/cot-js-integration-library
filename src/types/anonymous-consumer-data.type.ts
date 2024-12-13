export interface AnonymousConsumerData {
  general: General;
  person: Person;
  personWithCommunity: PersonWithCommunity;
  personWithBrand: PersonWithBrand;
}

export interface General {
  currency: string;
}

export interface Person {
  memberships: Membership[];
}

export interface Membership {
  service: string;
  type: string;
  since: string;
}

export interface PersonWithCommunity {
  lifetime: Lifetime;
  last365days: Last365Days;
  last30days: Last30Days;
}

export interface Lifetime {
  orders: Orders;
}

export interface Last365Days {
  orders: Orders;
}

export interface Last30Days {
  orders: Orders;
}

export interface PersonWithBrand {
  recurringCustomer: boolean;
  lastOrderTimeFrame: LastOrderTimeFrame;
  lifetime: Lifetime;
}

export interface Orders {
  volumeAvg: number;
  volumeMax: number;
  count: number;
}

export interface OrdersFrequency {
  value: number;
  timeFrame: FrequencyTimeFrame;
}

export interface OrdersVolume {
  volumeAvg: number;
  volumeMax: number;
}

export type FrequencyTimeFrame =
  | "ONE_DAY"
  | "TWO_DAYS"
  | "THREE_DAYS"
  | "ONE_WEEK"
  | "TWO_WEEKS"
  | "ONE_MONTH"
  | "THREE_MONTHS"
  | "SIX_MONTHS"
  | "ONE_YEAR"
  | "TWO_YEARS"
  | "FIVE_YEARS"
  | "MORE_THAN_FIVE_YEARS";

export type LastOrderTimeFrame =
  | "YESTERDAY"
  | "LAST_TWO_DAYS"
  | "LAST_THREE_DAYS"
  | "LAST_WEEK"
  | "LAST_TWO_WEEKS"
  | "LAST_MONTH"
  | "LAST_TWO_MONTHS"
  | "LAST_THREE_MONTHS"
  | "LAST_SIX_MONTHS"
  | "LAST_YEAR"
  | "LAST_TWO_YEARS"
  | "LAST_FIVE_YEARS"
  | "MORE_THAN_FIVE_YEARS";
