import { View, Text, Image, TouchableOpacity } from "react-native";

export default function Details({ route, navigation }) {
    const { car } = route.params;

    return (
        <View className="flex-1 bg-white p-4">
            <Image
                source={{ uri: car.image }}
                className="w-full h-52 rounded-2xl mb-4"
                resizeMode="cover"
            />
            <Text className="text-2xl font-bold mb-2">{car.name}</Text>
            <Text className="text-gray-700 mb-4">{car.price} ₺ / gün</Text>
            <TouchableOpacity
                className="bg-blue-500 py-3 rounded-xl"
                onPress={() => alert("Kiralama talebi oluşturuldu!")}
            >
                <Text className="text-white text-center text-lg font-semibold">
                    Kirala
                </Text>
            </TouchableOpacity>
        </View>
    );
}