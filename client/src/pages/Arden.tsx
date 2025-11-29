import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { ardenData } from "@/data/neighborhoods/arden";

const ArdenPage = () => {
  return <NeighborhoodPageTemplate data={ardenData} />;
};

export default ArdenPage;
