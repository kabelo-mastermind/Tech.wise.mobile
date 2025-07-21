import { Text , TouchableOpacity } from "react-native";

const CustomButton = ({ onPress, title, bgVariant = "primary", textVariant = "default", IconLeft, IconRigth, className }) => (
    <TouchableOpacity onPress={onPress} style={className}>
      {IconLeft && <IconLeft />}
      <Text>{title}</Text>
      {IconRigth && <IconRigth />}
    </TouchableOpacity>
  );

export default CustomButton ;