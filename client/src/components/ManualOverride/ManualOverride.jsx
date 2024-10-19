import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import io from 'socket.io-client';
import { setOverride, setInitialState } from '../../features/state/ManualOverrideSlice';
import './ManualOverride.css';

const ManualOverride = ({ data }) => {
  const dispatch = useDispatch();
  const state = useSelector((state) => state.manualOverride);
  const season = useSelector((state) => state.season.season); // Get the current season
  const [alertMessage, setAlertMessage] = useState('');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (data?.actStream) {
      const initialState = {
        boiler: getStatus(data.actStream[0].MO),
        chiller1: getStatus(data.actStream[1].MO),
        chiller2: getStatus(data.actStream[2].MO),
        chiller3: getStatus(data.actStream[3].MO),
        chiller4: getStatus(data.actStream[4].MO),
      };
      dispatch(setInitialState(initialState));
    }
  }, [data, dispatch]);

  const getStatus = (value) => (value === 0 ? 'auto' : value === 1 ? 'on' : 'off');

  const handleRadioChange = (device, value) => {
    const deviceNumber = {
      boiler: 0,
      chiller1: 1,
      chiller2: 2,
      chiller3: 3,
      chiller4: 4,
    }[device];

    const overrideValue = value === 'on' ? 1 : value === 'off' ? 2 : 0;
    dispatch(setOverride({ device, value }));

    const formData = new URLSearchParams();
    formData.append('device', deviceNumber);
    formData.append('manual_override', overrideValue);

    fetch('http://localhost:80/update_state', {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then((data) => {
        if (data.error) setAlertMessage('Relay switching has failed.');
      })
      .catch((error) => {
        console.error('Error:', error);
        setAlertMessage('Relay switching has failed.');
      });
  };

  useEffect(() => {
    // Initialize the WebSocket connection
    const socketInstance = io('http://localhost', { path: '/socket.io', transports: ['websocket'] });
    setSocket(socketInstance);

    socketInstance.on('connect', () => console.log('Connected to WebSocket server'));

    socketInstance.on('manual_override', (data) => {
      const deviceMap = ['boiler', 'chiller1', 'chiller2', 'chiller3', 'chiller4'];
      const deviceName = deviceMap[data.device];
      const status = getStatus(data.manual_override);
      dispatch(setOverride({ device: deviceName, value: status }));
    });

    socketInstance.on('chiller', (data) => {
      const status = data.status === 1 ? 'on' : 'off';
      dispatch(setOverride({ device: `chiller${data.device + 1}`, value: status }));
    });

    socketInstance.on('boiler', (data) => {
      const status = data.status === 1 ? 'on' : 'off';
      dispatch(setOverride({ device: 'boiler', value: status }));
    });
    socketInstance.on('manual_override', (data) => {
      const deviceMap = ['boiler', 'chiller1', 'chiller2', 'chiller3', 'chiller4'];
      if (data.device < deviceMap.length) {
        const deviceName = deviceMap[data.device];
        const status = getStatus(data.manual_override);
        dispatch(setOverride({ device: deviceName, value: status }));
      } else {
        console.warn(`Unexpected device index: ${data.device}`);
      }
    });
    

    socketInstance.on('connect_error', (err) => console.error('Connection error:', err));

    return () => {
      socketInstance.disconnect();
    };
  }, [dispatch]);

  return (
    <div className="manual-override">
      <div className="manual-override-body">
        <h2>Manual Override</h2>
        {alertMessage && (
          <div className="alert alert-danger">
            <a href="#" className="close" data-dismiss="alert" aria-label="close">
              &times;
            </a>
            <strong>Error!</strong> {alertMessage}
          </div>
        )}
       <div className="override-controls">
  {console.log(state)}
  {Object.keys(state)
    .filter((device, index) => index <= 4 && (device === 'boiler' || device.startsWith('chiller'))) // Allow only boiler and 4 chillers
    .map((device) => (
      <div key={device} className="control-group">
        <label>{device.replace(/^\w/, (c) => c.toUpperCase())}</label>
        <div className="radio-group">
          {['auto', 'on', 'off'].map((value) => (
            <label key={value}>
              <input
                type="radio"
                name={device}
                value={value}
                checked={state[device] === value}
                onChange={() => handleRadioChange(device, value)}
                disabled={
                  (season === 'Winter' && device.startsWith('chiller')) || // Disable chillers in Winter
                  (season === 'Summer' && device === 'boiler')            // Disable boiler in Summer
                }
              />{' '}
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </label>
          ))}
        </div>
      </div>
    ))}
</div>

      </div>
    </div>
  );
};

export default ManualOverride;
