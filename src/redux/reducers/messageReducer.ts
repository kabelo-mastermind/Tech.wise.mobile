interface Message {
  // define your message shape here, for example:
  id?: string;
  text?: string;
  [key: string]: any;
}

interface MessageState {
  messages: Message[];
}

type MessageAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'CLEAR_MESSAGES' }
  | { type: string; payload?: any };

const initialState: MessageState = {
  messages: [],
};

const messageReducer = (state = initialState, action: MessageAction): MessageState => {
  console.log("Message Reducer Action:", action);

  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: [],
      };
    default:
      return state;
  }
};

export default messageReducer;
