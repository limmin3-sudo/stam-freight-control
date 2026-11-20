type ShipPlateProps = {
  name: string;
  capacity?: number;
  capacityLabel: string;
};

export function ShipPlate({name, capacity, capacityLabel}: ShipPlateProps) {
  const parts = /^(MISC|RSI|Aegis|Anvil|앤빌|ARGO|Argo|Crusader|Drake|Gatac|Origin|CNOU|Esperia)\s+(.+)$/i.exec(name);
  const model = parts?.[2] ?? name;
  return <div className="ship-plate">
    <div className="ship-plate-type">
      <h2 aria-label={name} data-long={model.length > 15}>
        {parts && <small>{parts[1]}</small>}
        <span>{model}</span>
      </h2>
      {capacity !== undefined && <div className="ship-plate-capacity">
        <span className="ship-plate-sr">{capacityLabel} </span>{capacity.toLocaleString()} <span>SCU</span>
      </div>}
    </div>
  </div>;
}
