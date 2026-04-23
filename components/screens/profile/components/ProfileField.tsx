// src/components/ProfileField.tsx
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import React from "react";
import { TextInput } from "react-native";

interface ProfileFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  keyboardType?:
    | "default"
    | "email-address"
    | "phone-pad"
    | "numeric"
    | undefined;
  secureTextEntry?: boolean;
  extraClasses?: string;
  error?: string;

}

export default function ProfileField({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  secureTextEntry,
  extraClasses = "",
  error=""
}: ProfileFieldProps) {
  return (
    <VStack space="lg">
      <Text size="sm" className="text-white font-semibold">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#888"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        className={`border border-gray-700 rounded-lg px-3 py-4 text-white ${extraClasses}`}
        style={{ borderColor: "#444" }}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        editable={label === "Email ID" ? false : true} // Disable input if secureTextEntry is true
      />
      {error !=="" && (
        <Text size="sm" className="font-normal" style={{ color: "red"}}>
          {error}
        </Text>
      )}
    </VStack>
  );
}
