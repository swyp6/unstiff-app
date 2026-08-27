import { useState } from "react";
import { Text, TextInput, TextInputProps, View } from "react-native";

type TextareaStatus = "default" | "error";

interface TextareaProps extends Omit<
  TextInputProps,
  | "style"
  | "multiline"
  | "maxLength"
  | "value"
  | "defaultValue"
  | "onChangeText"
> {
  value?: string;
  defaultValue?: string;
  onChangeText?: (text: string) => void;

  /**
   * 최대 입력 글자 수
   * @default 100
   */
  maxLength?: number;

  /**
   * 에러 상태
   */
  status?: TextareaStatus;

  /**
   * 에러 상태에서 하단에 표시할 문구
   */
  errorMessage?: string;

  /**
   * 비활성화 상태
   */
  disabled?: boolean;
}

const COLORS = {
  text: "#191F28",
  placeholder: "#B0B8C1",

  background: "#FFFFFF",
  disabledBackground: "#F2F4F6",

  border: "#E5E8EB",
  focus: "#333D4B",
  error: "#F04452",

  counter: "#B0B8C1",
  disabledText: "#B0B8C1",
} as const;

export function Textarea({
  value,
  defaultValue = "",
  onChangeText,

  maxLength = 100,

  status = "default",
  errorMessage = "100자를 넘을 수 없어요",

  disabled = false,

  placeholder = "내용을 입력하세요",

  onFocus,
  onBlur,

  ...textInputProps
}: TextareaProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);

  const currentValue = value !== undefined ? value : internalValue;

  const currentLength = currentValue.length;

  const handleChangeText = (text: string) => {
    if (value === undefined) {
      setInternalValue(text);
    }

    onChangeText?.(text);
  };

  const textareaStateClass = (() => {
    if (disabled) {
      return "border-[#E5E8EB] bg-[#F2F4F6]";
    }

    if (status === "error") {
      return "border-[#F04452] bg-white";
    }

    if (isFocused) {
      return "border-[#333D4B] bg-white";
    }

    return "border-[#E5E8EB] bg-white";
  })();

  const textClass = disabled ? "text-[#B0B8C1]" : "text-[#191F28]";

  return (
    <View className="w-full gap-[6px]">
      {/* Textarea */}
      <View
        className={`h-[110px] w-full rounded-[8px] border px-[16px] py-[14px] ${textareaStateClass} `}
      >
        <TextInput
          {...textInputProps}
          value={currentValue}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          editable={!disabled}
          multiline
          maxLength={maxLength}
          textAlignVertical="top"
          scrollEnabled
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          className={`h-full w-full p-0 text-[15px] font-normal leading-[22px] ${textClass} `}
        />
      </View>

      {/* Footer */}
      <View className="h-[16px] w-full flex-row items-center justify-between">
        {status === "error" && !disabled ? (
          <Text className="flex-1 text-[12px] font-normal leading-[16px] text-[#F04452]">
            {errorMessage}
          </Text>
        ) : (
          <View className="flex-1" />
        )}

        <Text
          className={`text-[12px] font-normal leading-[16px] ${
            disabled ? "text-[#B0B8C1]" : "text-[#B0B8C1]"
          } `}
        >
          {currentLength} / {maxLength}
        </Text>
      </View>
    </View>
  );
}
