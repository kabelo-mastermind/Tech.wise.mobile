// redux/reducers/tripReducer.js
const initialState = {
  tripData: {},
  selectedRequest: null, // Add this line
};

const tripReducer = (state = initialState, action) => {
  switch (action.type) {
    case 'SET_TRIP_DATA':
      return {
        ...state,
        tripData: {
          ...state.tripData,
          ...action.payload,
        },
      };
    case 'SET_SELECTED_REQUEST':
      return {
        ...state,
        selectedRequest: action.payload,
      };
    default:
      return state;
  }
};

export default tripReducer;
