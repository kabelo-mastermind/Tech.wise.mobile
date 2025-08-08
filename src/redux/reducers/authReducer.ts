interface User {
  // Define the user shape, e.g.:
  id?: string;
  name?: string;
  email?: string;
  [key: string]: any;
}

interface AuthState {
  user: User | null;
}

type AuthAction =
  | { type: 'SET_USER'; payload: User }
  | { type: string; payload?: any };

const initialState: AuthState = {
  user: null,
};

const authReducer = (state = initialState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
};

export default authReducer;
