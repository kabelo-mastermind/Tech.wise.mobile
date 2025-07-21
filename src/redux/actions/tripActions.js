// redux/actions/tripActions.js
export const setTripData = (tripData) => {
    return {
      type: 'SET_TRIP_DATA',
      payload: tripData,
    };
  };

export const setSelectedRequest = (selectedRequest) => ({
  type: 'SET_SELECTED_REQUEST',
  payload: selectedRequest,
});
