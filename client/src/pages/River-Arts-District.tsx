import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { riverArtsDistrictData } from "@/data/neighborhoods/river-arts-district";

const RiverArtsDistrictPage = () => {
  return <NeighborhoodPageTemplate data={riverArtsDistrictData} />;
};

export default RiverArtsDistrictPage;
