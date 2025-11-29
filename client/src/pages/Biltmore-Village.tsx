import React from "react";
import NeighborhoodPageTemplate from "@/components/neighborhood/neighborhood-page-template";
import { biltmoreVillageData } from "@/data/neighborhoods/biltmore-village";

const BiltmoreVillagePage = () => {
  return <NeighborhoodPageTemplate data={biltmoreVillageData} />;
};

export default BiltmoreVillagePage;
