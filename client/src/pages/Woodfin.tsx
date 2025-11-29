import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { woodfinData } from "@/data/neighborhoods/woodfin";

const WoodfinPage = () => {
  return <NeighborhoodPageTemplate data={woodfinData} />;
};

export default WoodfinPage;
