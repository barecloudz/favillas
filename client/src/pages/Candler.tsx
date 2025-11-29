import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { candlerData } from "@/data/neighborhoods/candler";

const CandlerPage = () => {
  return <NeighborhoodPageTemplate data={candlerData} />;
};

export default CandlerPage;
