import { feature } from "topojson-client";
import type { GeometryObject, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";

const topology = world as unknown as Topology;

export const landFeature = feature(topology, topology.objects.land as GeometryObject);

export const countryFeature = feature(topology, topology.objects.countries as GeometryObject);
