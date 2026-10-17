import type { Area } from "../types/food";

const mrtAreas: Area[] = [
  { id: "tiong-bahru", name: "Tiong Bahru", mrt: "Tiong Bahru MRT · EW17", lat: 1.2861, lng: 103.8270 },
  { id: "chinatown", name: "Chinatown", mrt: "Chinatown MRT · NE4 / DT19", lat: 1.2844, lng: 103.8435 },
  { id: "bugis", name: "Bugis", mrt: "Bugis MRT · EW12 / DT14", lat: 1.3000, lng: 103.8559 },
  { id: "bishan", name: "Bishan", mrt: "Bishan MRT · NS17 / CC15", lat: 1.3509, lng: 103.8481 },
  { id: "tampines", name: "Tampines", mrt: "Tampines MRT · EW2 / DT32", lat: 1.3532, lng: 103.9452 },
  { id: "jurong-east", name: "Jurong East", mrt: "Jurong East MRT · NS1 / EW24", lat: 1.3331, lng: 103.7422 },
];
const names = ["Singapore","Ang Mo Kio","Bedok","Bishan","Boon Lay","Bukit Batok","Bukit Merah","Bukit Panjang","Bukit Timah","Central Water Catchment","Changi","Changi Bay","Choa Chu Kang","Clementi","Downtown Core","Geylang","Hougang","Jurong East","Jurong West","Kallang","Lim Chu Kang","Mandai","Marina East","Marina South","Marine Parade","Museum","Newton","North Eastern Islands","Novena","Orchard","Outram","Pasir Ris","Paya Lebar","Pioneer","Punggol","Queenstown","River Valley","Rochor","Seletar","Sembawang","Sengkang","Serangoon","Simpang","Singapore River","Southern Islands","Straits View","Sungei Kadut","Tampines","Tanglin","Tengah","Toa Payoh","Tuas","Western Islands","Western Water Catchment","Woodlands","Yishun","Tiong Bahru","Chinatown","Little India","Bugis"];
export const areas: Area[] = names.map(name => mrtAreas.find(area => area.name === name) ?? { id: name.toLowerCase().replace(/ /g, "-"), name, mrt: name === "Singapore" ? "All Singapore areas" : "Singapore area" });
export function areaById(id: string) { return areas.find(area => area.id === id); }
