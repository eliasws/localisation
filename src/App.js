import logo from './logo.svg';
import { useState, useEffect, useMemo, useCallback } from 'react';
import './App.css';
import trilateration from './trilateration';
import interpolate from './interpolation';

const lerp = (x, y, a) => x * (1 - a) + y * a;


const getResults = async () => {
  const data = await fetch('https://seg.solum-eslsystem.de/lbs/map/result?contents=true');
  return data.json();
};


const hexToDecimal = (data) => parseInt('0x' + data)


const maxX = 8;
const maxY = 5;

function App() {
  const [positionalData, setPositionalData] = useState([]);

  useEffect(() => {
    (async () => {
      setPositionalData(await getResults());
    })();
  }, []);

  const { shelf, unknown } = useMemo(() => {
    const shelf = [...Array(maxX)].map(e => Array(maxY).fill(null));
    const unknown = [];

    if (positionalData.length > 0) {
      console.log('SHELF', shelf);
      positionalData.filter(a => a.anchorEnabled === 1).forEach((data) => {
        console.log('data.positionId', data.positionId);

        let labelY = 0
        let labelX = 0

        switch (data.articleName[0]) {
          case 'Haribo':
            labelY = 2
            labelX = 1
            break;
          case 'Herman Hollerith Zentrum':
            labelY = 7
            labelX = 0
            break;
          case 'Gerolsteiner':
            labelY = 0
            labelX = 0
            break;
          case 'Clubs Clubs':
            labelY = 7
            labelX = 2
            break;
          default:
            console.log('NEW ANCHOR FOUND!');
        }
        let labelId = data.positionId.split('_')[1]
        shelf[labelY][labelX] = data
        // Interpolate to 100
        // labelY = interpolate(labelY, )
        // labelX
        const position = trilateration.vector(labelY, labelX)
        trilateration.addBeacon(labelId, position);
      });


      positionalData.filter(a => a.anchorEnabled !== 1).forEach((data) => {
        console.log('------------------------');
        if (data.anchorInfo.length < 3) {
          unknown.push(data);
        } else {
          data.anchorInfo.forEach(info => {
            const distance = hexToDecimal(info.rssi);
            trilateration.setDistance(info.positionId.split('_')[1], distance);
          });
          const value = trilateration.calculatePosition();
          console.log('TRILATERATION', value);
          const interpolatedX = Math.round(interpolate(value.x, -1000, 1000, 0, 8));
          const interpolatedY = Math.round(interpolate(value.y, -1000, 1000, 0, 5));
          console.log('INTERPOLATE X', interpolatedX);
          console.log('INTERPOLATE Y', interpolatedY);
          shelf[interpolatedY][interpolatedX] = data;
        }
      });
    }

    return { shelf, unknown };
  }, [positionalData]);

  console.log(positionalData);

  const renderLabel = useCallback((data) => {
    return (<div style={{ display: 'flex', flexDirection: 'column' }}>
        <img
          className="LabelImage"
          key={data.mac}
          src={'data:image/png;base64,' + data.labelStatus.contents[0].content}
          alt={data.articleName[0]}
        />
        {data.anchorInfo.map(info => (
          <div key={info.positionId}>{info.positionId + ':' + hexToDecimal(info.rssi)}</div>
        ))
        }
      </div>
    );
  }, []);

  return (

    <div className="App">
      <div className="Container">
        <div className="Shelf">
          {shelf.map((columns, columnIndex) =>
            columns.map(
              (cell, rowIndex) => {
                let style = {};
                style.gridColumn = columnIndex + 1;
                style.gridRow = rowIndex + 1;

                if (cell && cell.anchorEnabled === 1) {
                  style.border = 'solid';
                  style.borderRadius = 3;
                  style.borderColor = 'red';
                }

                let body = (rowIndex + 1) + '/' + (columnIndex + 1);


                if (cell && cell.labelStatus.contents.length) {
                  body = renderLabel(cell);
                }

                return <div
                  key={rowIndex + columnIndex}
                  style={style}
                  className="Label"
                >
                  {body}
                </div>;
              },
            ),
          )
          }
        </div>
        Unknown
        <div className="Unknown">{
          unknown.map(data => <div className="UnknownCell">{renderLabel(data)}</div>)
        }</div>
      </div>
    </div>
  );
}

export default App;
