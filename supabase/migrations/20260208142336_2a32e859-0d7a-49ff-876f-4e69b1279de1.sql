-- Create the trigger for auto AI replies on new inbound messages
CREATE TRIGGER on_new_message_chatbot_reply
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_chatbot_auto_reply();

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;