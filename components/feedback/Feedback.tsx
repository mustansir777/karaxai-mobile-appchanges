import { View } from "react-native";
import CustomModal from "../modal/CustomModal";
import { ThemeText } from "../theme/ThemeText";
import { CustomButton } from "../button/CustomButton";
import { useState } from "react";
import { useForm } from "react-hook-form";
import DescriptionInput from "../input/descriptionInput";
import { useMutation } from "@tanstack/react-query";
import { axiosApi, FeedbackPayload } from "@/api/api";
import { Toast } from "@/utils/toast";
import Zod, { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { StarRating } from "./star/RatingStar";
import Feather from "@expo/vector-icons/Feather";
import IconOne from "../icon/IconOne";

interface FeedbackProps {
  eventID: string;
  isDisabled?: boolean;
}

const feedbackSchema = Zod.object({
  message: z.string().min(1, {
    message: "Your feedback is important to us. Please fill out this field.",
  }),
});

type feedback = z.infer<typeof feedbackSchema>;

export const Feedback: React.FC<FeedbackProps> = ({ eventID, isDisabled }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const { control, handleSubmit, reset } = useForm<feedback>({
    defaultValues: {
      message: "",
    },
    resolver: zodResolver(feedbackSchema),
  });

  const handleFeedBackModal = () => {
    reset();
    setRating(0);
    setModalVisible(false);
  };

  const postFeedBack = useMutation({
    mutationKey: ["feedback"],
    mutationFn: async (payload: FeedbackPayload) => {
      const response = axiosApi({
        url: "/feedback/create-feedback/",
        method: "POST",
        data: payload,
      }).then((e) => e.data);
      return response;
    },
  });

  const onSubmit = (data: feedback) => {
    postFeedBack
      .mutateAsync({
        event_id: eventID,
        rating: rating,
        message: data.message,
      })
      .then((e) => {
        if (e.success) {
          Toast.show(
            e.message || "Feedback sent successfully",
            Toast.SHORT,
            "top",
            "success"
          );
          handleFeedBackModal();
        }
      })
      .catch((e) =>
        Toast.show(e.message?.message || "failed", Toast.SHORT, "top", "error")
      );
  };

  return (
    <View>
      <CustomButton
        disabled={isDisabled}
        onPress={() => setModalVisible(true)}
        type="primary"
        className="px-0 py-2 rounded-lg"
        icon={<IconOne />}
      />

      <CustomModal visible={modalVisible} onClose={handleFeedBackModal}>
        <ThemeText className="text-xl">Feedback</ThemeText>

        <View className="flex-grow h-[1px] bg-background-secondary mt-4" />

        <View className="mt-4 flex-col gap-4">
          <StarRating setStarRating={setRating} starRating={rating} />

          <DescriptionInput
            control={control}
            name="message"
            label="Feedback"
            placeholder="Enter your feedback"
            isStar={false}
          />

          <View className="flex-row w-full">
            <CustomButton
              onPress={handleFeedBackModal}
              title="Cancel"
              type="primary"
              className="px-2.5 py-4 rounded-lg flex-grow border-[#363636]"
            />

            <CustomButton
              disabled={postFeedBack.isPending}
              isLoading={postFeedBack.isPending}
              onPress={handleSubmit(onSubmit)}
              title="Feedback"
              type="secondary"
              className="px-2.5 py-4 rounded-lg flex-grow"
            />
          </View>
        </View>
      </CustomModal>
    </View>
  );
};
