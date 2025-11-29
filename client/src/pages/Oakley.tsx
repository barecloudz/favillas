import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { oakleyData } from "@/data/neighborhoods/oakley";

const OakleyPage = () => {
  return <NeighborhoodPageTemplate data={oakleyData} />;
};

export default OakleyPage;
