import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { kenilworthData } from "@/data/neighborhoods/kenilworth";

const KenilworthPage = () => {
  return <NeighborhoodPageTemplate data={kenilworthData} />;
};

export default KenilworthPage;
