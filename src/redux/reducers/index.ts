import { combineReducers } from 'redux';
import authReducer from './authReducer';
import tripReducer from './tripReducer';
import messageReducer from './messageReducer';

const rootReducer = combineReducers({
  auth: authReducer,
  trip: tripReducer,
  message: messageReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export default rootReducer;
