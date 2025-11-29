import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { enkaData } from "@/data/neighborhoods/enka";

const EnkaPage = () => {
  return <NeighborhoodPageTemplate data={enkaData} />;
};

export default EnkaPage;
