import { combineReducers} from 'redux';
import authReducer from './authReducer'; // Import your individual reducers
import tripReducer from './tripReducer';
import messageReducer from './messageReducer';

const rootReducer = combineReducers({
  auth: authReducer,
  trip: tripReducer,
  message: messageReducer,
  // Add other reducers here
});

export default rootReducer;
