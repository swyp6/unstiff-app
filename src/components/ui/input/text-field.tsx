import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, TextInputProps, View } from "react-native";

type TextFieldStatus = "default" | "success" | "error";

interface TextFieldProps extends Omit<TextInputProps, "editable" | "style"> {
  label?: string;
  helperText?: string;
  status?: TextFieldStatus;
  disabled?: boolean;

  actionLabel?: string;
  onPressAction?: () => void;

  onClear?: () => void;
}

const COLORS = {
  placeholder: "#B0B8C1",
  clearIcon: "#6B7684",
} as const;

export function TextField({
  label,
  helperText,
  status = "default",
  disabled = false,

  actionLabel,
  onPressAction,

  value,
  onChangeText,
  onClear,

  placeholder,

  onFocus,
  onBlur,

  ...textInputProps
}: TextFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  const hasValue = typeof value === "string" && value.length > 0;

  const showClear = isFocused && hasValue && status === "default" && !disabled;

  const handleClear = () => {
    onChangeText?.("");
    onClear?.();
  };

  const inputStateClass = (() => {
    if (disabled) {
      return "border-[#E5E8EB] bg-[#F2F4F6]";
    }

    if (status === "success") {
      return "border-[#03B26C] bg-white";
    }

    if (status === "error") {
      return "border-[#F04452] bg-white";
    }

    if (isFocused) {
      return "border-[#333D4B] bg-white";
    }

    return "border-[#E5E8EB] bg-white";
  })();

  const labelClass = disabled ? "text-[#B0B8C1]" : "text-[#4E5968]";

  const helperClass = (() => {
    if (disabled) {
      return "text-[#B0B8C1]";
    }

    if (status === "error") {
      return "text-[#F04452]";
    }

    return "text-[#4E5968]";
  })();

  const valueClass = disabled ? "text-[#B0B8C1]" : "text-[#191F28]";

  return (
    <View className="w-full gap-[8px]">
      {/* Label */}
      {label && (
        <Text
          className={`h-[18px] text-[14px] font-medium leading-[18px] ${labelClass} `}
        >
          {label}
        </Text>
      )}

      {/* Input + Action */}
      <View className="w-full flex-row items-center gap-[8px]">
        {/* Input */}
        <View
          className={`h-[48px] flex-1 flex-row items-center gap-[8px] rounded-[8px] border px-[16px] ${inputStateClass} `}
        >
          <TextInput
            {...textInputProps}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={COLORS.placeholder}
            editable={!disabled}
            onFocus={(event) => {
              setIsFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setIsFocused(false);
              onBlur?.(event);
            }}
            className={`h-full flex-1 p-0 text-[16px] font-normal leading-[22px] ${valueClass} `}
          />

          {/* Clear */}
          {showClear && (
            <Pressable
              onPress={handleClear}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="입력 내용 지우기"
              className="h-[20px] w-[20px] items-center justify-center rounded-full bg-[#E5E8EB]"
            >
              <Ionicons name="close" size={15} color={COLORS.clearIcon} />
            </Pressable>
          )}

          {/* Success */}
          {!disabled && status === "success" && (
            <View className="h-[20px] w-[20px] items-center justify-center rounded-full bg-[#03B26C]">
              <Ionicons name="checkmark" size={15} color="#FFFFFF" />
            </View>
          )}

          {/* Error */}
          {!disabled && status === "error" && (
            <View className="h-[20px] w-[20px] items-center justify-center rounded-full bg-[#F04452]">
              <Text className="text-[14px] font-bold leading-[18px] text-white">
                !
              </Text>
            </View>
          )}
        </View>

        {/* Action Button */}
        {actionLabel && (
          <Pressable
            disabled={disabled}
            onPress={onPressAction}
            accessibilityRole="button"
            className={`h-[48px] items-center justify-center rounded-[8px] border px-[16px] ${
              disabled
                ? "border-[#E5E8EB] bg-[#F2F4F6]"
                : "border-[#E5E8EB] bg-white"
            } `}
          >
            <Text
              className={`text-[14px] font-medium leading-[18px] ${
                disabled ? "text-[#B0B8C1]" : "text-[#191F28]"
              } `}
            >
              {actionLabel}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Helper */}
      {helperText && (
        <Text
          className={`h-[16px] text-[12px] font-normal leading-[16px] ${helperClass} `}
        >
          {helperText}
        </Text>
      )}
    </View>
  );
}
