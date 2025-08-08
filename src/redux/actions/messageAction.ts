// Define your message shape
export interface Message {
  id?: string;
  text?: string;
  [key: string]: any;
}

// Action Types
export const ADD_MESSAGE = 'ADD_MESSAGE';
export const CLEAR_MESSAGES = 'CLEAR_MESSAGES';

// Action creators
export const addMessage = (messageData: Message) => ({
  type: ADD_MESSAGE as typeof ADD_MESSAGE,
  payload: messageData,
});

export const clearMessages = () => ({
  type: CLEAR_MESSAGES as typeof CLEAR_MESSAGES,
});
