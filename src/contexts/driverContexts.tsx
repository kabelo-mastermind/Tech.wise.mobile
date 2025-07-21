// ContextFile.js
import React, { createContext, useReducer } from 'react';
import {DriverOriginReducer, DriverDestinationReducer} from '../reducers/reducers';

export const DriverOriginContext = createContext();
export const DriverDestinationContext = createContext();

export const DriverOriginContextProvider = (props) => {
    const [origin, dispatchOrigin] = useReducer(DriverOriginReducer, {
        latitude: null,
        longitude: null,
        address: "",
        name: ""
    });

    return (
        <DriverOriginContext.Provider value={{ origin, dispatchOrigin }}>
            {props.children}
        </DriverOriginContext.Provider>
    );
};

export const DriverDestinationContextProvider = (props) => {
    const [destination, dispatchDestination] = useReducer(DriverDestinationReducer, {
        latitude: null,
        longitude: null,
        address: "",
        name: ""
    });

    return (
        <DriverDestinationContext.Provider value={{ destination, dispatchDestination }}>
            {props.children}
        </DriverDestinationContext.Provider>
    );
};
