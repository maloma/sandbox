import handoffToInessa from "./01-handoff-to-inessa.mjs";
import orderRegistration from "./02-order-registration.mjs";
import pricingAccounting from "./03-pricing-accounting.mjs";
import attorneyDispatch from "./04-attorney-dispatch.mjs";
import documentArrival from "./05-document-arrival.mjs";
import clientNotification from "./06-client-notification.mjs";
import personalHandover from "./07-personal-handover.mjs";
import payment from "./08-payment.mjs";
import postalDelivery from "./09-postal-delivery.mjs";
import statusControl from "./10-status-control.mjs";
import exceptions from "./11-exceptions.mjs";

export const QUESTIONNAIRE_VERSION = "1.0";

export const QUESTION_PRIORITIES = Object.freeze({
  REQUIRED: "Обязательно",
  RECOMMENDED: "Желательно",
  LATER: "Можно позже",
});

export const QUESTIONS = Object.freeze([
  ...handoffToInessa,
  ...orderRegistration,
  ...pricingAccounting,
  ...attorneyDispatch,
  ...documentArrival,
  ...clientNotification,
  ...personalHandover,
  ...payment,
  ...postalDelivery,
  ...statusControl,
  ...exceptions,
]);
