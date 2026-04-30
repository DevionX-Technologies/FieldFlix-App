import TurfImage6 from "@/components/assets/images/aim-sports.jpg";
import TurfImage3 from "@/components/assets/images/nanavati-image-2.jpg";
import TurfImage5 from "@/components/assets/images/nanavati-image.jpg";
import TurfImage7 from "@/components/assets/images/TSG_SPORTS_ARENA.jpg";
import { Box } from "@/components/ui/box";
import { ClockIcon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useResponsiveDesign } from "@/hooks/useResponsiveDesign";
import { useAppSelector } from "@/store";
import React from "react";
import { ScrollView } from "react-native";
import CardCarousel from "../components/card";

const turfs = [
  
  {
    name: "PickPad | AIM Sports",
    description: "PickPad by AIM Sports is the new padel hub in Mumbai. The venue features a padel court and two pickleball courts offering players premium facilities to level up their game!",

    turfImages: [
      {
        image: TurfImage6,
        name: "Nanavati Sports Complex",
        location: "Thane",
        description: "Sports complex in Thane, Maharashtra",
      },
      // {
      //   image: TurfImage3,
      //   name: "Hatrics Football / Cricket Turf",
      //   location: "Thane",
      //   description: "Sports complex in Thane, Maharashtra",
      // },
    ],
    image: TurfImage6,
    location: "Goregaon West",
    amenitiesList: [
      { key: "24x7", label: "24×7", icon: <ClockIcon />, active: true, iconKey: "clock" },
      { key: "Floodlights", label: "Floodlights", icon: <ClockIcon />, active: true, iconKey: "clock" },
      {
        key: "Washroom",
        label: "Washroom ",
        icon: <ClockIcon />,
        active: true, iconKey: "clock"
      },
      {
        key: "CorporateEvents",
        label: "Corporate Events",
        icon: <ClockIcon />,
        active: true, iconKey: "clock"
      },
      {
        key: "Drinking Water",
        label: "Drinking Water",
        icon: <ClockIcon />,
        active: true, iconKey: "clock"
      },
      { key: "Rentalequipment", label: "Rental Equipment", icon: <ClockIcon />, active: true, iconKey: "clock" },
      { key: "Seatingarea", label: "Seating Area", icon: <ClockIcon />, active: true, iconKey: "clock" },
      { key: "Warmuparea", label: "Warm Up Area", icon: <ClockIcon />, active: true, iconKey: "clock" },
    ],
    geo_location: {
      coordinates: [19.17253574457214, 72.84598504417492],
      type: "Point",
    },
    address_line:
      "3rd Floor, Timestar House, 12, S.V. Road, above Infiniti Hospital, Udyog Nagar, Goregaon West, Mumbai, Maharashtra 400062",
    contact_phone: "+91 9819799147",
    opening_time: "06:00:00",
    closing_time: "22:00:00",
  },

];

const Pickleturfs = [
  {
    name: "Aim Sports | Nanavati",
    description:
      "Located at CNVM School, Aim Sports offers a premium sporting experience with its well-maintained pitch, ensuring top-quality play for athletes of all levels. Designed to cater to both casual games and competitive matches, Aim Sports provides a vibrant atmosphere where players can enjoy the game to the fullest. With excellent facilities and a commitment to quality, it’s the perfect destination for enthusiasts seeking the best playing conditions.",
    turfImages: [
      {
        image: TurfImage5,
        name: "Nanavati Sports Complex",
        location: "Thane",
        description: "Sports complex in Thane, Maharashtra",
      },
      {
        image: TurfImage3,
        name: "Hatrics Football / Cricket Turf",
        location: "Thane",
        description: "Sports complex in Thane, Maharashtra",
      },
    ],
    image: TurfImage5,
    location: "Vile Parle West",
    amenitiesList: [
      { key: "24x7", label: "24×7", icon: <ClockIcon />, active: true, iconKey: "clock" },
      {
        key: "artificial",
        label: "Artificial Turf",
        icon: <ClockIcon />,
        active: true, iconKey: "clock"
      },
      {
        key: "floodlights",
        label: "Flood Lights",
        icon: <ClockIcon />,
        active: true, iconKey: "clock"
      },
      { key: "washroom", label: "Washroom", icon: <ClockIcon />, active: true, iconKey: "clock" },
    ],
    geo_location: {
      coordinates: [19.0967912, 72.840826],
      type: "Point",
    },
    address_line:
      "Shree Chandulal Nanavati Vinay Mandir (Nanavati School), Vallabhbhai Patel Road, LIC Colony, Suresh Colony, Vile Parle West",
    contact_phone: "+91 9819799147",
    opening_time: "06:00:00",
    closing_time: "22:00:00",
  },
  {
    name: "TSG Sports Arena | Botanical Gardens",
    description: "",
    turfImages: [
      {
        image: TurfImage7,
        name: "TSG Sports Arena",
        location: "Andheri West",
        description: "Top quality pickleball centre at Botanical Gardens",
      },
    ],
    image: TurfImage7,
    location: "Andheri West",
    amenitiesList: [
      { key: "floodlights", label: "Floodlights", icon: <ClockIcon />, active: true, iconKey: "clock" },
      { key: "washroom", label: "Washroom", icon: <ClockIcon />, active: true, iconKey: "clock" },
      { key: "drinking_water", label: "Drinking Water", icon: <ClockIcon />, active: true, iconKey: "clock" },
      { key: "rental_equipment", label: "Rental Equipment", icon: <ClockIcon />, active: true, iconKey: "clock" },
      { key: "warm_up_area", label: "Warm Up Area", icon: <ClockIcon />, active: true, iconKey: "clock" },
    ],
    geo_location: {
      coordinates: [19.1335, 72.8358], // Approximate coordinates for Andheri West, Botanical Gardens area
      type: "Point",
    },
    address_line:
      "Captain Suresh Samant Marg, Shastri Nagar, Andheri West, Mumbai, Maharashtra 400102",
    contact_phone: "+91 9819799147", // Using the same contact as other venues, you can update this
    opening_time: "06:00:00",
    closing_time: "22:00:00",
  },



];

export default function TurfSection() {
  const { font } = useResponsiveDesign();
  const { activeSport } = useAppSelector((state) => state.home);
  return (
    <>
      <Box className="flex flex-row justify-between items-center w-full mb-5">
        <Text className="text-app-baseColor" style={{ fontSize: font.lg }} bold>
          Nearby Venues
        </Text>
      </Box>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <CardCarousel items={activeSport === "Pickle" ? Pickleturfs:turfs} />
      </ScrollView>
    </>
  );
}
