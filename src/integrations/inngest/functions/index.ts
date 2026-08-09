import { processTask } from "@/integrations/inngest/functions/example";
import { sendReservationWhatsApp } from "@/integrations/inngest/functions/reservation-whatsapp";

export const functions = [processTask, sendReservationWhatsApp];
