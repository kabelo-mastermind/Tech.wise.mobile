// redux/reducers/tripReducer.js
const initialState = {
  messages: [], // Store multiple chat messages here
};

const messageReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
    case 'CLEAR_MESSAGES': // optional: clear when ending chat/trip
      return {
        ...state,
        messages: [],
      };
    default:
      return state;
  }
};

export default messageReducer;
