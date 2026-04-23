import TurfImage3 from "@/components/assets/images/chat_gpt_turf3.png";
import TurfImage5 from "@/components/assets/images/chat_gpt_turf5.png";
import { ClockIcon } from "@/components/ui/icon";
export const turfData = {
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
  amenitiesList: [
    { key: "24x7", label: "24×7", icon: <ClockIcon />, active: true },
    {
      key: "artificial",
      label: "Artificial Turf",
      icon: <ClockIcon />,
      active: false,
    },
    {
      key: "floodlights",
      label: "Flood Lights",
      icon: <ClockIcon />,
      active: false,
    },
    { key: "washroom", label: "Washroom", icon: <ClockIcon />, active: true },
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
};
