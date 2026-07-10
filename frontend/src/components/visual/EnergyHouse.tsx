export function EnergyHouse() {
  return (
    <div className="zami-house">
      <div className="house-card" />
      <div className="house-roof" />
      <div className="house-body" />
      <div className="house-window w1" />
      <div className="house-window w2" />
      <div className="house-window w3" />
      <div className="house-window w4" />

      <div className="float-card right-10 top-8">
        <p className="text-xs text-slate-400">Économies/an</p>
        <p className="text-3xl font-black text-emerald-400">+540€</p>
      </div>

      <div className="float-card left-8 top-12">
        <p className="text-xs text-slate-400">DPE actuel</p>
        <p className="text-4xl font-black text-yellow-400">E</p>
      </div>

      <div className="float-card bottom-8 right-16">
        <p className="text-xs text-slate-400">Budget estimé</p>
        <p className="text-3xl font-black text-white">31 500€</p>
      </div>
    </div>
  );
}
