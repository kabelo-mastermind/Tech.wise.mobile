import { Dispatch } from 'redux';

// Define the shape of your trip data and request
export interface TripData {
  [key: string]: any;
}

export interface SelectedRequest {
  [key: string]: any;
}

// Action Types
export const SET_TRIP_DATA = 'SET_TRIP_DATA';
export const SET_SELECTED_REQUEST = 'SET_SELECTED_REQUEST';

// Action creators with types
export const setTripData = (tripData: TripData) => ({
  type: SET_TRIP_DATA as typeof SET_TRIP_DATA,
  payload: tripData,
});

export const setSelectedRequest = (selectedRequest: SelectedRequest) => ({
  type: SET_SELECTED_REQUEST as typeof SET_SELECTED_REQUEST,
  payload: selectedRequest,
});

// Optional: If you use thunk, you can type the dispatch explicitly
// export const setTripDataThunk = (tripData: TripData) => (dispatch: Dispatch) => {
//   dispatch(setTripData(tripData));
// };
